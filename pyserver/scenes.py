from copy import deepcopy

from three import *

FT2METERS = 0.3048
IN2METERS = 0.0254


def basement():
    L, W, H = 20, 20, 8 * FT2METERS
    scene = Scene()
    square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0,  0.5],
                                               [ 0.5, 0,  0.5], [ 0.5, 0, -0.5]],
                                     uvs=[(0,1), (0,0), (1,0), (1,1)])
    floor = Mesh(name="floor", geometry=square,
                 material=MeshBasicMaterial(shading=FlatShading, color=0xffffff,
                                            map=Texture(image=Image("deck", url="images/deck.png"), repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping])),
                 position=[0, 0, 0],
                 scale=[L,1,W],
                 userData={'cannonData': cannonData})
    scene.add(floor)

    def desk():
        top = Mesh(geometry=BoxGeometry(47 * IN2METERS, 1.75 * IN2METERS, 24 * IN2METERS),
            material=MeshLambertMaterial(color=0xaaaaaa))
        top.position[1] = (29 - 1.75 / 2) * IN2METERS
        obj = Object3D()
        obj.add(top)
        return obj

    scene.add(desk())

    return scene.export()


def shader_room(length=10, width=10, height=10):
    L, W, H = 1.0*length, 1.0*width, 1.0*height
    yMin, yMax = -1.2, -1.2 + H
    xMin, xMax = -L/2, L/2
    zMin, zMax = -W/2, W/2
    yAvg = (yMin + yMax) / 2
    textures = [Texture(image=Image("deck", url="images/deck.png"), repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping])]

    scene = Scene()
    scene.add(AmbientLight(color=0x151515))

    scene.add(PointLight(color=0x880000, intensity=0.7, distance=50,
                         position=[0.45 * L, 0, -0.4 * W]))

    scene.add(PointLight(color=0x008800, intensity=0.7, distance=50,
                         position=[-0.45 * L, 0, -0.4 * W]))

    square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0,  0.5],
                                               [ 0.5, 0,  0.5], [ 0.5, 0, -0.5]],
                                     uvs=[(0,1), (0,0), (1,0), (1,1)])
    cannonData = {'mass': 0, 'shapes': ['Plane']}

    scene.add(Mesh(name="floor", geometry=square,
                   material=MeshBasicMaterial(side=FrontSide, shading=FlatShading, color=0xffffff,
                                              map=textures[0]),
                   receiveShadow=True,
                   position=[0, yMin, 0],
                   scale=[L,1,W],
                   userData={'cannonData': cannonData}))

    if ShaderLib is not None:
        shader = deepcopy(ShaderLib['cube'])
        # shader['uniforms']['tCube']['value'] = ["examples/editvr/Park2/%s.jpg" % pos
        #                                         for pos in ('posx', 'negx', 'posy', 'negy', 'posz', 'negz')]
        # shader['uniforms']['tCube']['value'] = ["examples/editvr/SwedishRoyalCastle/%s.jpg" % pos
        #                                         for pos in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]
        # skyBox = Mesh(geometry=BoxGeometry(666, 666, 666),
        #               material=ShaderMaterial(side=BackSide, **shader))
        shader['uniforms']['tCube']['value'] = ["examples/editvr/MilkyWay/dark-s_%s.jpg" % pos
                                                for pos in ('px', 'nx', 'py', 'ny', 'pz', 'nz')]
        scene.add(Mesh(geometry=BoxGeometry(666, 666, 666),
                       material=ShaderMaterial(side=BackSide, **shader)))

    return scene.export()


def some_room(length=15.0, width=12.0, height=10.0):
    # TODO: Python 3 vs 2 division thing
    L, W, H = length, width, height
    yMin, yMax = -1.2, -1.2 + H
    xMin, xMax = -L/2, L/2
    zMin, zMax = -W/2, W/2
    yAvg = (yMin + yMax) / 2

    side_colors = [0xaaffff, 0xffffaa, 0xffaaff, 0xffaaaa, 0xaaffaa, 0xaaaaff]

    scene = Scene()

    scene.add(AmbientLight(color=0x151515))
    scene.add(PointLight(color=0x880000, intensity=0.8, distance=50,
                         position=[0.45 * L, yAvg+1, -0.4 * W]))
    scene.add(PointLight(color=0x008800, intensity=0.8, distance=50,
                         position=[-0.45 * L, yAvg-1, -0.4 * W]))

    square = RectangleBufferGeometry(vertices=[[-0.5, 0, -0.5], [-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 0, -0.5]],
                                     uvs=[(0,1), (0,0), (1,0), (1,1)])
    cannonData = {'mass': 0, 'shapes': ['Plane']}

    scene.add(Mesh(name="floor", geometry=square,
                   material=MeshBasicMaterial(shading=FlatShading,
                                              color=0xffffff,
                                              map=Texture(image=Image(url="images/deck.png"),
                                                          repeat=[L, W], wrap=[RepeatWrapping, RepeatWrapping])),
                   position=[0, yMin, 0],
                   scale=[L, 1, W],
                   userData={'cannonData': cannonData}))

    scene.add(Mesh(name="ceiling", geometry=square,
                   material=MeshPhongMaterial(shading=FlatShading, color=side_colors[1]),
                   position=[0, yMax, 0],
                   rotation=[np.pi, 0, 0],
                   scale=[L, 1, W],
                   userData={'cannonData': cannonData}))

    scene.add(Mesh(name="front", geometry=square,
                   material=MeshPhongMaterial(shading=FlatShading, color=side_colors[2]),
                   position=[0, yAvg, zMax],
                   rotation=[np.pi/2, np.pi, 0],
                   scale=[L,1,H],
                   userData={'cannonData': cannonData}))

    scene.add(Mesh(name="left", geometry=square,
                   material=MeshPhongMaterial(shading=FlatShading, color=side_colors[3]),
                   position=[xMin, yAvg, 0],
                   rotation=[np.pi/2, np.pi/2, 0],
                   scale=[W,1,H],
                   userData={'cannonData': cannonData}))

    scene.add(Mesh(name="cylinder", geometry=CylinderGeometry(200, 200, 9/16.0 * 2 * np.pi * 200,
                                                              openEnded=True, radiusSegments=16),
                   material=MeshBasicMaterial(side=BackSide, shading=FlatShading, color=0xffffff,
                                              map=Texture(image=Image(url="images/radiosity_37.png"),
                                                          minFilter=LinearFilter))))

    scene.add(Mesh(geometry=TextGeometry(text="Hello.  This scene was generated by the Python function 'scenes.some_room'", parameters={'size': 0.25, 'height': 0.02}),
                   material=MeshLambertMaterial(color=0xffff99),
                   position=[-2.666, 1.6, -4]))

    return scene.export()


def underwater_tomb(length=20, width=20, height=20):
    L, W, H = length, width, height

    side_colors = [0xaaffff, 0xffffaa, 0xffaaff, 0xffaaaa, 0xaaffaa, 0xaaaaff]
    scene = Scene()

    scene.add(AmbientLight(color=0x151515))

    scene.add(PointLight(color=0x880000, intensity=0.6, distance=30,
                         position=[0.45 * L, 0, -0.4 * W]))

    scene.add(PointLight(color=0x008800, intensity=0.6, distance=30,
                         position=[-0.45 * L, 0, -0.4 * W]))

    scene.add(Mesh(name="heightfield",
                   geometry=PlaneBufferGeometry(width=L, height=W, widthSegments=127, heightSegments=127),
                   material=MeshLambertMaterial(color=0xffffff, shading=SmoothShading),
                   position=[0,-5,0],
                   rotation=[-np.pi/2, 0, 0],
                   userData={'cannonData': {
                               'mass': 0.0,
                               'shapes': ['Heightfield']
                              },
                              'heightmap': 'images/terrain128.png'
                            }))

    return scene.export()
