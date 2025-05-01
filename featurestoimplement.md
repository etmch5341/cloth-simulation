Project: Implement a mass-spring physical simulation, 
and use it to animate squishy objects or cloth. Look up peridynamics, 
and use it to implement fracture (breaking of objects) when they collide 
with each other or the floor.

# REQUIRED
 - ~~Cloth~~ 
 - Squishy Objects (Ball/Other imported)
 - Peridynamics

## Should Implement

### REQUIRED: Squishy Object -> PROBABLY SKIP FOR NOW
 - Implement squishy ball being dropped

### REQUIRED: Peridynamics
 - Implement fracture object when drop on floor

### Improvements
 - ~~Remove uneeded files?~~
 - ~~Improve all cloth tests (should not blow up, improve wind test by having higher wind number)~~
 - ~~Move cam back for all, so can see the cloth directly~~
 - ~~Starting scene should not have cloth conflicting~~
 - ~~Minecraft skybox (and maybe lighting) so not as dark~~ lighting still bad and shaders still have the random patches of blue triangles

### Toggling
 - ~~Toggle b/w different scenes and tests (ensure that they all work)~~
 - ~~Reset should replay the current animation enabled w/ updated params if they changed~~

### Different Tests
 - ~~Test to demo each 1-# face (3 seconds for each face test) just run through them~~

### Free Test
 - Can select a "Free" simulation type where you are allowed to change anything
 - button to enable/disable corner point/center point
 - Can type number of faces (for the face tests)

## Additional +features
 - Figure out how to import different models
 - Game Dev where blow up ball using Space and wasd to move (make one level or something)
 - WASD to move squishy object
 - auto panning cam so that it moves around in a circle facing the center, good for display (make as a toggle)
 - visualization mode to cloth


# Plans

#### 4/30
 - ~~All improvements~~
 - ~~removed gravity setting~~
 - ~~Finish toggling (for all current features and ensure that they work)~~
 - ~~Different Tests: Demo diff # of faces~~
 

#### 5/1
 - Peridynamics Implementation
 - visualization mode to cloth
 - Free tests
 - Toggling for All new tests and items implemented from 4/30
 - Additional Features
