#!/bin/bash
# Download all audio files from CDN to local assets directory
# Run this script once to cache audio files locally

set -e

AUDIO_DIR="../assets/audio"
mkdir -p "$AUDIO_DIR"

echo "Downloading audio assets..."

# Sound effects
curl -o "$AUDIO_DIR/laser1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/laser1.mp3"
curl -o "$AUDIO_DIR/pew1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/pew1.mp3"
curl -o "$AUDIO_DIR/cannon1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/cannon1.mp3"
curl -o "$AUDIO_DIR/powerup1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/powerup1.mp3"
curl -o "$AUDIO_DIR/shot_alt1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/shot_alt1.mp3"
curl -o "$AUDIO_DIR/rocket1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/rocket1.mp3"

# Explosions
curl -o "$AUDIO_DIR/explosion1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/explosion1.mp3"
curl -o "$AUDIO_DIR/explosion_heavy1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/explosion_heavy1.mp3"
curl -o "$AUDIO_DIR/explosion_long.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/explosion_long.mp3"

# Ambient
curl -o "$AUDIO_DIR/ufo1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/ufo1.mp3"
curl -o "$AUDIO_DIR/plane1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/plane1.mp3"
curl -o "$AUDIO_DIR/parachute1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/parachute1.mp3"
curl -o "$AUDIO_DIR/cloth_pop1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/cloth_pop1.mp3"
curl -o "$AUDIO_DIR/radio_ping1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/radio_ping1.mp3"
curl -o "$AUDIO_DIR/pickup1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/pickup1.mp3"

# Loops
curl -o "$AUDIO_DIR/wind_loop.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/wind_loop.mp3"
curl -o "$AUDIO_DIR/engine_loop1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/engine_loop1.mp3"

# Music
mkdir -p "$AUDIO_DIR/music"
curl -o "$AUDIO_DIR/music/chip1.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/music/chip1.mp3"
curl -o "$AUDIO_DIR/music/chip2.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/music/chip2.mp3"
curl -o "$AUDIO_DIR/music/chip3.mp3" "https://cdn.jsdelivr.net/gh/AI-UX/sfx/music/chip3.mp3"

echo "✅ All audio files downloaded successfully!"
echo "Run 'npm run build' to include them in your production bundle."
