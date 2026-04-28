# Remote Command - Quick Reference Card

## 🚀 Server Commands
```bash
./game.sh start     # Start game server
./game.sh stop      # Stop game server  
./game.sh restart   # Restart server
./game.sh status    # Check status
```

## ⌨️ Keyboard Controls

### Shooting Mode
```
← / A    Angle left (increase)
→ / D    Angle right (decrease)
↑ / W    Power up
↓ / S    Power down
SPACE    Fire!
ENTER    Fire!
```

### Drive Mode
```
← / A    Move left (costs fuel)
→ / D    Move right (costs fuel)
SPACE    Fire!
ENTER    Fire!
```

## 🎮 Game Flow

1. **Aim**: Adjust angle (0-180°) and power (10-100%)
2. **Move** (optional): Toggle Drive Mode, reposition tank
3. **Fire**: Space/Enter or click button
4. **AI Turn**: AI plays automatically (~1.5s delay)
5. **Repeat**: Until one tank remains

## 💣 Weapons

| Weapon | Best For | Damage | Radius |
|--------|----------|--------|--------|
| Missile | Balanced shots | 30 | 40px |
| Heavy | Direct hits | 50 | 60px |
| Nuke | Close range | 80 | 120px |
| MIRV | Area denial | 35 | 50px (×5) |
| Funky | Scatter damage | 25 | 45px (×8) |

## ⛽ Resources

- **Health**: 100 per tank
- **Fuel**: 200 per tank
- **Fuel Cost**: 2 per move
- **Max Distance**: 50 pixels per turn

## 🎯 Pro Tips

1. **Save fuel** for critical repositioning
2. **High ground** gives better firing angles
3. **Watch wind** - affects all projectiles
4. **Nuclear option** for guaranteed damage
5. **MIRV** spreads at medium altitude
6. **Funky bomb** hits behind cover
7. **Move after shooting** to avoid return fire
8. **AI compensates** for wind automatically

## 📊 UI Elements

```
┌─────────────────────────────────────────┐
│ Player Name    Health: 100              │
│ Weapon: [Missile ▼]                     │
│ Angle: [====|====] 45°                  │
│ Power: [=======|=] 70%                  │
│ [FIRE!] [Drive: OFF] [Restart]          │
│ Fuel: 200%                              │
│ Wind: -5.2                              │
└─────────────────────────────────────────┘
```

## 🎨 Visual Features

- ✨ Twinkling stars (150+)
- 🚜 3D-style tanks with treads
- 🌄 Textured terrain with gradients
- 💥 Particle explosions
- 🌊 Smoke trails
- 📊 Health bars
- ⛽ Fuel indicators

## 🐛 Troubleshooting

**Port in use?**
```bash
./game.sh stop
./game.sh start
```

**AI not moving?**
- Wait 1.5 seconds after projectile lands
- Check game log for errors

**Can't fire?**
- Check if it's your turn (not AI)
- Ensure animations are complete

**Tank won't move?**
- Toggle Drive Mode ON
- Check fuel level
- Can't move during animations

## 📁 Files

- `game.sh` - Server control
- `config.json` - Game settings
- `js/` - Game code
- `*.md` - Documentation

## 🔧 Configuration

Edit `config.json`:
```json
{
  "tank": {
  "fuelCapacity": 200,
    "fuelConsumptionRate": 2,
    "maxMoveDistance": 50
  }
}
```

## 🏆 Win Condition

Last tank with health > 0 wins!

---

**URL**: http://localhost:5500  
**Docs**: See README.md and NEW_FEATURES.md
