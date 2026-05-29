#!/bin/bash
# Download face-api.js models to public/models/
# These are the SSD Mobilenet v1, Face Landmark 68, and Face Recognition models
# The models are from: https://github.com/vladmandic/face-api/tree/master/model

MODEL_DIR="public/models"
mkdir -p "$MODEL_DIR"

# SSD Mobilenet v1 - face detection
echo "Downloading SSD Mobilenet v1..."
BASE_URL="https://raw.githubusercontent.com/vladmandic/face-api/master/model"
wget -q "$BASE_URL/ssd_mobilenetv1_model-weights_manifest.json" -O "$MODEL_DIR/ssd_mobilenetv1_model-weights_manifest.json"
wget -q "$BASE_URL/ssd_mobilenetv1_model-shard1" -O "$MODEL_DIR/ssd_mobilenetv1_model-shard1"

# Face Landmark 68
echo "Downloading Face Landmark 68..."
wget -q "$BASE_URL/face_landmark_68_model-weights_manifest.json" -O "$MODEL_DIR/face_landmark_68_model-weights_manifest.json"
wget -q "$BASE_URL/face_landmark_68_model-shard1" -O "$MODEL_DIR/face_landmark_68_model-shard1"

# Face Recognition Net
echo "Downloading Face Recognition Net..."
wget -q "$BASE_URL/face_recognition_model-weights_manifest.json" -O "$MODEL_DIR/face_recognition_model-weights_manifest.json"
wget -q "$BASE_URL/face_recognition_model-shard1" -O "$MODEL_DIR/face_recognition_model-shard1"
wget -q "$BASE_URL/face_recognition_model-shard2" -O "$MODEL_DIR/face_recognition_model-shard2"

echo "All models downloaded to $MODEL_DIR/"