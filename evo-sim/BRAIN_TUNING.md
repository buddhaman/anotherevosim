# Brain and Actuator Tuning

## Problem
Creatures were wiggling very little and all appeared purple (mid-range friction). This was caused by:

1. **Brain weights too small**: Initialized at scale 0.1, causing GRU outputs near 0
2. **Joint angles too small**: Limited to ±10 degrees, barely visible movement

## Solution

### 1. Increased Brain Weight Initialization
**Changed in**: `Genome.ts`

```typescript
// Before: weights in range [-0.1, 0.1]
brainGene[i] = (Math.random() * 2 - 1) * 0.1;

// After: weights in range [-0.5, 0.5]
brainGene[i] = (Math.random() * 2 - 1) * 0.5;
```

**Effect**: 5x larger initial weights → more expressive initial behavior → outputs spread across [-1, 1] range

### 2. Increased Joint Angle Range
**Changed in**: `Gene.ts`

```typescript
// Before: ±10 degrees
static JOINT_ANGLE_DEVIATION: number = 10 * (Math.PI / 180);

// After: ±60 degrees
static JOINT_ANGLE_DEVIATION: number = 60 * (Math.PI / 180);
```

**Effect**: 6x larger joint range → much more visible wiggling and locomotion

### 3. Increased Default Mutation Parameters
**Changed in**: `Genome.ts`

```typescript
// Before: rate=0.1, strength=0.1
mutate(mutationRate: number = 0.1, mutationStrength: number = 0.1)

// After: rate=0.15, strength=0.2
mutate(mutationRate: number = 0.15, mutationStrength: number = 0.2)
```

**Effect**: More aggressive evolution → faster discovery of interesting behaviors

## Technical Details

### Brain Output Mapping
The GRU outputs use `tanh` activation, producing values in [-1, 1]:

**Joint Control** (first N outputs):
```typescript
// Map [-1, 1] to [minAngle, maxAngle]
targetAngle = minAngle + ((output + 1) / 2) * (maxAngle - minAngle)
```
- output = -1 → joint at minimum angle
- output = 0 → joint at center
- output = +1 → joint at maximum angle

**Friction Control** (next N outputs):
```typescript
// Map [-1, 1] to [0.0, 1.0] (lowFriction to highFriction)
friction = 0.0 + ((output + 1) / 2) * 1.0
```
- output = -1 → friction = 0.0 (red, free sliding)
- output = 0 → friction = 0.5 (purple, mid-range)
- output = +1 → friction = 1.0 (green, full grip)

### Color Coding
Body parts change color based on friction:
- **Red/Orange**: Low friction (sliding)
- **Purple**: Medium friction
- **Green/Blue**: High friction (gripping)

Now creatures should display varied colors and active movement!

## Expected Behavior
- ✅ Visible wiggling and joint articulation
- ✅ Color variation across body parts (friction control)
- ✅ More dynamic initial behavior (even without evolution)
- ✅ Faster convergence to interesting locomotion strategies
