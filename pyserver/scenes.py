from copy import deepcopy

from three import *


def shader_room(length=10, width=10, height=10):
    L, W, H = length, width, height
    yMin, yMax = -1.2, -1.2 + H
    xMin, xMax = -L/2, L/2
    zMin, zMax = -W/2, W/2
    yAvg = (yMin + yMax) / 2
    textures = [Texture(image=Image("deck", url="images/deck.png"), repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping])]
    
    scene = Scene()
    scene.add(AmbientLight(color=0x151515))

    pointLight = PointLight(color=0x880000, intensity=0.7, distance=50,
                            position=[0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    pointLight = PointLight(color=0x008800, intensity=0.7, distance=50,
                            position=[-0.45 * L, 0, -0.4 * W])
    scene.add(pointLight)

    square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0,  0.5],
                                               [ 0.5, 0,  0.5], [ 0.5, 0, -0.5]],
                                     uvs=[(0,1), (0,0), (1,0), (1,1)])
    cannonData = {'mass': 0, 'shapes': ['Plane']}

    floor = Mesh(name="floor", geometry=square,
                 material=MeshBasicMaterial(side=FrontSide, shading=FlatShading, color=0xffffff,
                                            map=textures[0]),
                 receiveShadow=True,
                 position=[0, yMin, 0],
                 scale=[L,1,W],
                 userData={'cannonData': cannonData})
    scene.add(floor)

    uniforms = deepcopy(ShaderLib['cube']['uniforms'])
    uniforms['tCube']['value'] = ["examples/WebVRStudio/Park2/%s.jpg" % pos
                                  for pos in ('posx', 'negx', 'posy', 'negy', 'posz', 'negz')]
    skyBox = Mesh(geometry=BoxGeometry(666, 666, 666),
                  material=ShaderMaterial(side=BackSide,
                                          vertexShader=ShaderLib["cube"]["vertexShader"],
                                          fragmentShader=ShaderLib["cube"]["fragmentShader"],
                                          uniforms=uniforms))
    scene.add(skyBox)

    # cylinder = Mesh(name="cylinder", geometry=CylinderGeometry(200, 200, 9/16 * 2 * np.pi * 200,
    #                                                            openEnded=True, radiusSegments=16),
    #                 material=MeshBasicMaterial(side=BackSide, shading=FlatShading, color=0xffffff,
    #                                            map=Texture(image=Image("radiosity", url="images/radiosity_37.png"))))
    # scene.add(cylinder)

    return scene.export()


def some_room(length=15, width=15, height=10):
    L, W, H = length, width, height
    yMin, yMax = -1.2, -1.2 + H
    xMin, xMax = -L/2, L/2
    zMin, zMax = -W/2, W/2
    yAvg = (yMin + yMax) / 2
    textures = [Texture(image=Image("deck", url="images/deck.png"), repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping]),
                Texture(image=Image("radiosity", url="images/radiosity_37.png"))]
    materials = [MeshPhongMaterial(side=FrontSide, shading=FlatShading, color=color)
                 for color in [0xaaffff, 0xffffaa, 0xffaaff, 0xffaaaa, 0xaaffaa, 0xaaaaff]]
    
    scene = Scene()

    scene.add(AmbientLight(color=0x151515))
    scene.add(PointLight(color=0x880000, intensity=0.7, distance=50,
                         position=[0.45 * L, 0, -0.4 * W]))
    scene.add(PointLight(color=0x008800, intensity=0.7, distance=50,
                         position=[-0.45 * L, 0, -0.4 * W]))

    square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                                     uvs=[(0,1), (0,0), (1,0), (1,1)])
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
    scene.add(ceiling)

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

    scene.add(Mesh(geometry=TextGeometry(text="Hello", parameters={'size': 0.1, 'height': 0.02}),
                   material=MeshLambertMaterial(color=0xffff00),
                   position=[0, 1.6, -4]))
    
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
