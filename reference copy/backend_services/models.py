from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    population = Column(Integer)
    
    # Relationship to locations
    locations = relationship("Location", back_populates="ward_obj")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    ward_name = Column(String, ForeignKey("wards.name"))
    
    # Risk factors
    isp = Column(Float, default=50.0)
    road_density = Column(Float, default=10.0)
    ndvi = Column(Float, default=0.3)
    population_density = Column(Float, default=15000.0)
    
    # Relationships
    ward_obj = relationship("Ward", back_populates="locations")

class SimulationParam(Base):
    __tablename__ = "simulation_params"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(Float)
