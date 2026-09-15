import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from server import app

# Vercel Serverless Function Handler
app = app