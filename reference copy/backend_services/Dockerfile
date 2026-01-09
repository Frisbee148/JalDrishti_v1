# Use official Python runtime as a parent image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for some spatial libs if needed later)
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose port 8000
EXPOSE 8000

# Run the application with Gunicorn (Production Server)
# -k uvicorn.workers.UvicornWorker : Use Uvicorn for async performance
# -w 4 : 4 Worker processes (scaled for typical 2-core cloud instances)
# --bind : Host and Port
CMD ["gunicorn", "server:app", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "--bind", "0.0.0.0:8000"]
