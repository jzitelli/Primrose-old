from three import *


def shader_room(length=10, width=10, height=10):
    L, W, H = length, width, height
    yMin, yMax = -1.2, -1.2 + H
    xMin, xMax = -L/2, L/2
    zMin, zMax = -W/2, W/2
    yAvg = (yMin + yMax) / 2
    images = [Image("deck", url="images/deck.png")]
    textures = [Texture(image=images[0], repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping])]
    
    scene = Scene()
    scene.add(AmbientLight(color=0x151515))

    pointLight = PointLight(color=0x880000, intensity=0.6, distance=30,
        position=[0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    pointLight = PointLight(color=0x008800, intensity=0.6, distance=30,
        position=[-0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    square = RectangleBufferGeometry(vertices=[[-0.5,0,-0.5], [-0.5,0,0.5], [0.5,0,0.5], [0.5,0,-0.5]],
        uvs=[(0,1), (0,0), (1,0), (1,1)])
    cannonData = {'mass': 0, 'shapes': ['Plane']}

    floor = Mesh(name="floor", geometry=square, material=MeshBasicMaterial(side=FrontSide, shading=FlatShading, color=0xffffff, map=textures[0]),
        receiveShadow=True,
        position=[0, yMin, 0],
        scale=[L,1,W],
        userData={'cannonData': cannonData})
    scene.add(floor)

    vertexShader = r"""
uniform float mRefractionRatio;
uniform float mFresnelBias;
uniform float mFresnelScale;
uniform float mFresnelPower;

varying vec3 vReflect;
varying vec3 vRefract[3];
varying float vReflectionFactor;

void main() {

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );

    vec3 worldNormal = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );

    vec3 I = worldPosition.xyz - cameraPosition;

    vReflect = reflect( I, worldNormal );
    vRefract[0] = refract( normalize( I ), worldNormal, mRefractionRatio );
    vRefract[1] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.99 );
    vRefract[2] = refract( normalize( I ), worldNormal, mRefractionRatio * 0.98 );
    vReflectionFactor = mFresnelBias + mFresnelScale * pow( 1.0 + dot( normalize( I ), worldNormal ), mFresnelPower );

    gl_Position = projectionMatrix * mvPosition;

}
"""
    fragmentShader = r"""
uniform samplerCube tCube;

varying vec3 vReflect;
varying vec3 vRefract[3];
varying float vReflectionFactor;

void main() {

    vec4 reflectedColor = textureCube( tCube, vec3( -vReflect.x, vReflect.yz ) );
    vec4 refractedColor = vec4( 1.0 );

    refractedColor.r = textureCube( tCube, vec3( -vRefract[0].x, vRefract[0].yz ) ).r;
    refractedColor.g = textureCube( tCube, vec3( -vRefract[1].x, vRefract[1].yz ) ).g;
    refractedColor.b = textureCube( tCube, vec3( -vRefract[2].x, vRefract[2].yz ) ).b;

    gl_FragColor = mix( refractedColor, reflectedColor, clamp( vReflectionFactor, 0.0, 1.0 ) );

}
"""
    # TODO: how to set value for type 't' uniforms (textures)?
    # sphere = Mesh(name="sphere", geometry=SphereBufferGeometry(radius=1),
    #     material=ShaderMaterial(vertexShader=vertexShader, fragmentShader=fragmentShader,
    #         uniforms={'mRefractionRatio': {'type': 'f', 'value': 1.02},
    #             'mFresnelBias': {'type': 'f', 'value': 0.1},
    #             'mFresnelPower': {'type': 'f', 'value': 2},
    #             'mFresnelScale': {'type': 'f', 'value': 1},
    #             'tCube': {'type': 't', 'value': None}}))
    # scene.add(sphere)

    return scene.export()


def some_room(length=15, width=15, height=10, **kwargs):
    L, W, H = length, width, height
    yMin, yMax = -1.2, -1.2 + H
    xMin, xMax = -L/2, L/2
    zMin, zMax = -W/2, W/2
    yAvg = (yMin + yMax) / 2
    images = [Image("deck", url="images/deck.png"),
        Image("radiosity", url="images/radiosity_37.png")]
    textures = [Texture(image=images[0], repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping]),
        Texture(image=images[1])]
    materials = [MeshPhongMaterial(side=FrontSide, shading=FlatShading, color=color) for color in [0xaaffff,
        0xffffaa, 0xffaaff, 0xffaaaa, 0xaaffaa, 0xaaaaff]]
    geometries = []
    
    scene = Scene()
    scene.add(AmbientLight(color=0x151515))

    pointLight = PointLight(color=0x880000, intensity=0.6, distance=30,
        position=[0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    pointLight = PointLight(color=0x008800, intensity=0.6, distance=30,
        position=[-0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    square = RectangleBufferGeometry(vertices=[[-0.5,0,-0.5], [-0.5,0,0.5], [0.5,0,0.5], [0.5,0,-0.5]],
        uvs=[(0,1), (0,0), (1,0), (1,1)])
    geometries.append(square);
    cannonData = {'mass': 0, 'shapes': ['Plane']}

    materials[0] = MeshBasicMaterial(side=FrontSide, shading=FlatShading, color=0xffffff, map=textures[0])
    floor = Mesh(name="floor", geometry=square, material=materials[0],
        receiveShadow=True,
        position=[0, yMin, 0],
        scale=[L,1,W],
        userData={'cannonData': cannonData})
    scene.add(floor)

    ceiling = Mesh(name="ceiling", geometry=square,
        material=materials[1],
        receiveShadow=True,
        position=[0, yMax, 0],
        rotation=[np.pi, 0, 0],
        scale=[L,1,W],
        userData={'cannonData': cannonData})
    #scene.add(ceiling)

    front = Mesh(name="front", geometry=square,
        material=materials[2],
        receiveShadow=True,
        position=[0, yAvg, zMax],
        rotation=[np.pi/2, np.pi, 0],
        scale=[L,1,H],
        userData={'cannonData': cannonData})
    scene.add(front)
    
    back = Mesh(name="back", geometry=square,
        material=materials[4],
        receiveShadow=True,
        position=[0, yAvg, zMin],
        rotation=[np.pi/2, 0, 0],
        scale=[L,1,H],
        userData={'cannonData': cannonData})
    #scene.add(back)

    left = Mesh(name="left", geometry=square,
        material=materials[3],
        receiveShadow=True,
        position=[xMin, yAvg, 0],
        rotation=[np.pi/2, np.pi/2, 0],
        scale=[W,1,H],
        userData={'cannonData': cannonData})
    scene.add(left)

    right = Mesh(name="right", geometry=square,
        material=materials[5],
        receiveShadow=True,
        position=[xMax, yAvg, 0],
        rotation=[np.pi/2, -np.pi/2, 0],
        scale=[W,1,H],
        userData={'cannonData': cannonData})
    #scene.add(right)

    cylinder = Mesh(name="cylinder", geometry=CylinderGeometry(200, 200, 9/16 * 2 * np.pi * 200,
        openEnded=True, radiusSegments=16),
        material=MeshBasicMaterial(side=BackSide, shading=FlatShading, color=0xffffff, map=textures[1]))
    scene.add(cylinder)

    return scene.export()


def underwater_tomb(length=20, width=20, height=20, **kwargs):
    L, W, H = length, width, height
    materials = [MeshPhongMaterial(side=FrontSide, shading=FlatShading, color=color) for color in [0xaaffff,
        0xffffaa, 0xffaaff, 0xffaaaa, 0xaaffaa, 0xaaaaff]]
    geometries = []
    
    scene = Scene()
    scene.add(AmbientLight(color=0x151515))

    pointLight = PointLight(color=0x880000, intensity=0.6, distance=30,
        position=[0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    pointLight = PointLight(color=0x008800, intensity=0.6, distance=30,
        position=[-0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    geometries.append(PlaneBufferGeometry(width=20, height=20, widthSegments=127, heightSegments=127))
    materials.append(MeshPhongMaterial(side=DoubleSide, color=0xffffff, shading=SmoothShading))
    mesh = Mesh(name="heightfield", geometry=geometries[-1], material=materials[-1],
        position=[0,-5,0], rotation=[-np.pi/2, 0, 0],
        receiveShadow=True,
        userData={'cannonData': {
            'mass': 0.0,
            'shapes': ['Heightfield']
        }, 'heightmap': 'images/terrain128.png'})
    scene.add(mesh)

    square = RectangleBufferGeometry(vertices=[[-0.5,0,-0.5], [-0.5,0,0.5], [0.5,0,0.5], [0.5,0,-0.5]],
        uvs=[(0,1), (0,0), (1,0), (1,1)])
    geometries.append(square);
    cannonData = {'mass': 0, 'shapes': ['Plane']}

    floor = Mesh(name="floor", geometry=square, material=materials[0],
        receiveShadow=True,
        position=[0,-H/2,0],
        scale=[L,1,W],
        userData={'cannonData': cannonData})
    scene.add(floor)

    ceiling = Mesh(name="ceiling", geometry=square, material=materials[1],
        receiveShadow=True,
        position=[0, H/2, 0],
        rotation=[np.pi, 0, 0],
        scale=[L,1,W],
        userData={'cannonData': cannonData})
    scene.add(ceiling)

    front = Mesh(name="front", geometry=square, material=materials[2],
        receiveShadow=True,
        position=[0, 0, W/2],
        rotation=[np.pi/2, np.pi, 0],
        scale=[L,1,H],
        userData={'cannonData': cannonData})
    scene.add(front)
    
    back = Mesh(name="back", geometry=square, material=materials[4],
        receiveShadow=True,
        position=[0, 0, -W/2],
        rotation=[np.pi/2, 0, 0],
        scale=[L,1,H],
        userData={'cannonData': cannonData})
    scene.add(back)

    left = Mesh(name="left", geometry=square, material=materials[3],
        receiveShadow=True,
        position=[-L/2, 0, 0],
        rotation=[np.pi/2, np.pi/2, 0],
        scale=[W,1,H],
        userData={'cannonData': cannonData})
    scene.add(left)

    right = Mesh(name="right", geometry=square, material=materials[5],
        receiveShadow=True,
        position=[L/2, 0, 0],
        rotation=[np.pi/2, -np.pi/2, 0],
        scale=[W,1,H],
        userData={'cannonData': cannonData})
    scene.add(right)

    return scene.export()
