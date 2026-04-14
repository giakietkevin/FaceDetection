#!/bin/bash
# Start SafeGuard Senior - Python AI Analyzer
# Run this from the python-analyzer directory

echo "🚀 Starting SafeGuard Senior - Python AI Analyzer..."
echo "📍 Location: $(pwd)"

# Activate venv
if [ -d "venv" ]; then
    source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
    echo "✅ Virtual environment activated"
else
    echo "❌ Virtual environment not found. Run: python -m venv venv"
    exit 1
fi

# Check if dependencies are installed
python -c "import fastapi, torch, librosa" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Dependencies not installed. Run: pip install -r requirements.txt"
    exit 1
fi

echo "✅ All dependencies ready"
echo ""
echo "🔧 Starting FastAPI server on http://localhost:8001"
echo "📊 Check health: curl http://localhost:8001/health"
echo ""

# Start the server
python app.py
