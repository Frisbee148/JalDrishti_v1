import pandas as pd
from database import engine, SessionLocal
from models import Base, Ward, Location
import os

def init_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Load Population Data (Wards)
    pop_csv = "backend/SEC_WW_POP_2022.csv"
    if os.path.exists(pop_csv):
        print(f"Loading Wards from {pop_csv}...")
        df_pop = pd.read_csv(pop_csv)
        for _, row in df_pop.iterrows():
            w_name = str(row['ward']).strip().upper()
            pop = int(row['total_population'])
            
            # Check if exists
            existing = db.query(Ward).filter(Ward.name == w_name).first()
            if not existing:
                ward = Ward(name=w_name, population=pop)
                db.add(ward)
        db.commit()
    else:
        print(f"Warning: {pop_csv} not found.")

    # 2. Load Demo Locations
    # Prioritize demo_locations.csv
    loc_csv = "backend/demo_locations.csv"
    if not os.path.exists(loc_csv):
        loc_csv = "demo_locations.csv"

    if os.path.exists(loc_csv):
        print(f"Loading Locations from {loc_csv}...")
        df_loc = pd.read_csv(loc_csv)
        # Clear existing locations to avoid dupes on re-run
        db.query(Location).delete()
        
        for _, row in df_loc.iterrows():
            ward_name = str(row.get('ward_name', 'Unknown')).strip().upper()
            
            # Ensure Ward exists (for ForeignKey constraint)
            # If CSV has a ward not in POP file, we might need a fallback. 
            # ideally we create it or link to 'UNKNOWN'
            ward_exists = db.query(Ward).filter(Ward.name == ward_name).first()
            if not ward_exists:
                # Create placeholder ward
                new_ward = Ward(name=ward_name, population=0)
                db.add(new_ward)
                db.commit()

            loc = Location(
                latitude=row['latitude'],
                longitude=row['longitude'],
                ward_name=ward_name,
                isp=row.get('isp', 50),
                road_density=row.get('road_density', 10),
                ndvi=row.get('ndvi', 0.3),
                population_density=row.get('population_density', 15000)
            )
            db.add(loc)
        db.commit()
    else:
        print(f"Warning: {loc_csv} not found.")

    print("Database initialization complete.")
    db.close()

if __name__ == "__main__":
    init_db()
