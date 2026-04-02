# "slim" = smaller size, no unnecessary packages
FROM python:3.11-slim

# All commands after this run from /app
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Tell Docker this container listens on port 8000
EXPOSE 8000

# Command to start the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]