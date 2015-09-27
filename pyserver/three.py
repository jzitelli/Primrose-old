"""Define three.js entities from Python with this module.

These Python classes support JSON serializions which can be loaded by THREE.ObjectLoader.
"""

import sys
import os
import json
import uuid
import numpy as np
# import sympy as sp

DEG2RAD = np.pi / 180

FrontSide, BackSide, DoubleSide = 0, 1, 2
FlatShading, SmoothShading = 1, 2
NoColors, FaceColors, VertexColors = 0, 1, 2
UVMapping, CubeReflectionMapping, CubeRefractionMapping = 300, 301, 302
RepeatWrapping, ClampToEdgeWrapping, MirroredRepeatWrapping = 1000, 1001, 1002
NearestFilter, NearestMipMapNearestFilter, NearestMipMapLinearFilter, LinearFilter, LinearMipMapNearestFilter, LinearMipMapLinearFilter = 1003, 1004, 1005, 1006, 1007, 1008

# TODO: JSON encoder for Three objects
class Three(object):
    num = 0
    def __init__(self, name=None):
        if name is None:
            name = "Three object %d" % Three.num
        self.name = name
        self.uuid = uuid.uuid4()
        Three.num += 1
    def json(self):
        """Returns a dict which can be JSON serialized (by json.dumps)"""
        try:
            return {"type": self.__class__.__name__,
                    "uuid": unicode(self.uuid),
                    "name": self.name}
        except NameError:
            return {"type": self.__class__.__name__,
                    "uuid": str(self.uuid),
                    "name": self.name}


class Object3D(Three):
    def __init__(self, name=None, position=(0,0,0), rotation=(0,0,0), scale=(1,1,1), visible=None, castShadow=None, receiveShadow=None, userData=None, **kwargs):
        Three.__init__(self, name)
        self.position = np.array(position)
        self.rotation = np.array(rotation)
        self.scale = np.array(scale)
        self.children = []
        if visible is not None:
            self.visible = visible
        if castShadow is not None:
            self.castShadow = castShadow
        if receiveShadow is not None:
            self.receiveShadow = receiveShadow
        if userData is not None:
            self.userData = userData
    def add(self, obj):
        self.children.append(obj)
    def find_geometries(self, geometries=None):
        if geometries is None:
            geometries = {}
        for c in self.children:
            if hasattr(c, 'geometry'):
                geometries[c.geometry.uuid] = c.geometry
            else:
                c.find_geometries(geometries)
        return geometries
    def find_materials(self, materials=None):
        if materials is None:
            materials = {}
        for c in self.children:
            if hasattr(c, 'material'):
                materials[c.material.uuid] = c.material
            else:
                c.find_materials(materials)
        return materials
    def find_textures(self, textures=None):
        if textures is None:
            textures = {}
        for c in self.children:
            if hasattr(c, 'texture'):
                textures[c.texture.uuid] = c.texture
            else:
                c.find_textures(textures)
        return textures
    def find_images(self, images=None):
        if images is None:
            images = {}
        for c in self.children:
            if hasattr(c, 'image'):
                images[c.image.uuid] = c.image
            else:
                c.find_images(images)
        return images
    def json(self):
        S = np.diag(list(self.scale) + [1])
        I = np.eye(4)
        T = I.copy()
        T[:3,-1] = self.position
        # TODO: never checked this rigorously:
        Rx = I.copy()
        s, c = np.sin(self.rotation[0]), np.cos(self.rotation[0])
        Rx[1,1] = c; Rx[1,2] = -s
        Rx[2,1] = s; Rx[2,2] = c
        Ry = I.copy()
        s, c = np.sin(self.rotation[1]), np.cos(self.rotation[1])
        Ry[0,0] = c;  Ry[0,2] = s
        Ry[2,0] = -s; Ry[2,2] = c
        Rz = I.copy()
        s, c = np.sin(self.rotation[2]), np.cos(self.rotation[2])
        Rz[0,0] = c; Rz[0,1] = -s
        Rz[1,0] = s; Rz[1,1] = c
        matrix = T.dot(Rz).dot(Ry).dot(Rx).dot(S)
        d = Three.json(self)
        d.update({"matrix": matrix.T.ravel().tolist(),
                  'children': [c.json() for c in self.children]})
        d.update({k: v for k, v in self.__dict__.items()
            if k not in ['position', 'rotation', 'scale'] + list(d.keys())})
        return d
    def export(self, geometries=None, materials=None, textures=None, images=None):
        if geometries is None:
            geometries = self.find_geometries()
        if materials is None:
            materials = self.find_materials()
        if textures is None:
            textures = self.find_textures()
        if images is None:
            images = self.find_images()
        return {'object': self.json(),
            "geometries": [g.json() for g in geometries.values()],
            "materials": [m.json() for m in materials.values()],
            "textures": [t.json() for t in textures.values()],
            "images": [i.json() for i in images.values()]}


class Scene(Object3D):
    def __init__(self, **kwargs):
        Object3D.__init__(self, **kwargs)


class Mesh(Object3D):
    def __init__(self, geometry=None, material=None, **kwargs):
        Object3D.__init__(self, **kwargs)
        self.geometry = geometry
        self.material = material
    def json(self):
        d = Object3D.json(self)
        try:
            d.update({"material": unicode(self.material.uuid),
                      "geometry": unicode(self.geometry.uuid)})
        except NameError:
            d.update({"material": str(self.material.uuid),
                      "geometry": str(self.geometry.uuid)})            
        return d


class Light(Object3D):
    def __init__(self, color=0xffffff, intensity=None, distance=None, **kwargs):
        Object3D.__init__(self, **kwargs)
        self.color = color
        if intensity is not None:
            self.intensity = intensity
        if distance is not None:
            self.distance = distance
    def json(self):
        d = Object3D.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k in ('color', 'intensity',
            'distance', 'shadowDarkness', 'shadowCameraNear', 'shadowCameraFar', 'shadowCameraLeft', 'shadowCameraRight', 'shadowCameraTop', 'shadowCameraBottom')})
        return d


class AmbientLight(Light):
    pass


class PointLight(Light):
    pass


class DirectionalLight(Light):
    def __init__(self, target=None, **kwargs):
        Light.__init__(self, **kwargs)
        if target is None:
            target = np.zeros(3)
        self.target = target
    def json(self):
        d = Light.json(self)
        d['target'] = self.target.tolist()
        return d


class PerspectiveCamera(Object3D):
    def __init__(self, fov=50, aspect=1, near=0.1, far=2000, **kwargs):
        Object3D.__init__(self, name=name, **kwargs)
        self.fov = fov
        self.aspect = aspect
        self.near = near
        self.far = far
    def json(self):
        d = Object3D.json(self)
        d['type'] = 'Camera'
        d.update({k: self.__dict__[k] for k in ['fov', 'aspect', 'near', 'far']})
        return d


class Material(Three):
    def __init__(self, name=None, **kwargs):
        Three.__init__(self, name)
        self.__dict__.update(kwargs)
    def json(self):
        d = Three.json(self)
        d['type'] = "Material"
        d.update({k: v for k, v in self.__dict__.items() if k not in d})
        return d


class MeshBasicMaterial(Material):
    def json(self):
        d = Material.json(self)
        d["type"] = "MeshBasicMaterial"
        return d


class MeshLambertMaterial(Material):
    def json(self):
        d = Material.json(self)
        d["type"] = "MeshLambertMaterial"
        return d


class MeshPhongMaterial(Material):
    def json(self):
        d = Material.json(self)
        d["type"] = "MeshPhongMaterial"
        return d


class Texture(Three):
    def __init__(self, minFilter=LinearMipMapLinearFilter, magFilter=LinearFilter, mapping=UVMapping, anisotropy=1, image=None, name=None):
        Three.__init__(self, name)
        self.minFilter = minFilter
        self.magFilter = magFilter
        self.mapping = mapping
        self.anisotropy = anisotropy
        self.image = image
    def json(self):
        d = Three.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k in ('minFilter', 'magFilter', 'mapping', 'anisotropy')})
        if self.image:
            try:
                d['image'] = unicode(self.image.uuid)
            except NameError:
                d['image'] = str(self.image.uuid)
        return d


class Image(Three):
    def __init__(self, name=None, url=None):
        Three.__init__(self, name)
        self.url = url
    def json(self):
        d = Three.json(self)
        if self.url:
            d['url'] = self.url
        return d


class Geometry(Three):
    def __init__(self, name=None, vertices=None, colors=None, faces=None):
        Three.__init__(self, name)
        self.vertices = vertices
        self.colors = colors
        self.faces = faces
    def as_buffer_geometry(self):
        return BufferGeometry(name=self.name, vertices=self.vertices, indices=self.indices, normals=self.normals, uvs=self.uvs)


class BufferGeometry(Three):
    def __init__(self, name=None, vertices=None, indices=None, normals=None, uvs=None):
        Three.__init__(self, name)
        self.vertices = vertices
        self.normals = normals
        self.indices = indices
        self.uvs = uvs
    def json(self):
        d = Three.json(self)
        d['type'] = "BufferGeometry"
        d.update({"data": {
                    "attributes": {
                      "position": {
                        "type": "Float32Array",
                        "itemSize": 3,
                        "array": np.array(self.vertices).ravel().tolist()
                      }
                    }
                  }})
        if self.indices:
            d['data']['attributes']['index'] = {
                "itemSize": 1,
                "type": "Uint32Array",
                "array": np.array(self.indices).ravel().tolist()
            }
        if self.normals:
            d['data']['attributes']['normal'] = {
                "type": "Float32Array",
                "itemSize": 3,
                "array": np.array(self.normals).ravel().tolist()
            }
        if self.uvs:
            d['data']['attributes']['uv'] = {
                "type": "Float32Array",
                "itemSize": 2,
                "array": np.array(self.uvs).ravel().tolist()
            }
        return d


class CylinderGeometry(Geometry):
    def __init__(self, radiusTop=20, radiusBottom=20, height=100, radiusSegments=8, heightSegments=1,
        openEnded=False, thetaStart=0, thetaLength=2*np.pi, **kwargs):
        Three.__init__(self)
        self.radiusTop = radiusTop
        self.radiusBottom = radiusBottom
        self.height = height
        self.radiusSegments = radiusSegments
        self.heightSegments = heightSegments
        self.openEnded = openEnded
        self.thetaStart = thetaStart
        self.thetaLength = thetaLength
    def json(self):
        d = Three.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k not in d and v is not None})
        return d


class DodecahedronGeometry(Geometry):
    def __init__(self, radius=1, detail=0, **kwargs):
        Geometry.__init__(self)
        self.radius = radius
        self.detail = detail
    def json(self):
        d = Three.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k not in d and v is not None})
        return d


class TriangleBufferGeometry(BufferGeometry):
    def __init__(self, vertices, **kwargs):
        BufferGeometry.__init__(self, vertices=vertices, indices=(0,1,2), **kwargs)


def _tri_faces(rect_face):
    "Return indices for two triangles comprising the rectangle"
    return [[rect_face[0], rect_face[1], rect_face[2]], [rect_face[0], rect_face[2], rect_face[3]]]


class RectangleBufferGeometry(BufferGeometry):
    """Defines two triangles representing a rectangle - indices are (0,1,2), (0,2,3)"""
    def __init__(self, vertices, uvs=None, **kwargs):
        BufferGeometry.__init__(self, vertices=vertices, uvs=uvs, indices=_tri_faces([0,1,2,3]), **kwargs)
    def get_shape(self):
        """Get the type of CANNON.js shape which represents this type of geometry"""
        return "Plane"


class BoxBufferGeometry(BufferGeometry):
    def __init__(self, vertices, inward_normals=False, **kwargs):
        rects = [[0,1,2,3], # bottom
            [4,7,6,5], # top
            [0,4,5,1], # back
            [2,1,5,6], # right
            [3,2,6,7], # front
            [0,3,7,4]] # left
        if inward_normals:
            rects = [r[::-1] for r in rects]
        BufferGeometry.__init__(self, vertices=vertices,
            indices=[_tri_faces(rect) for rect in rects],
            **kwargs)


class TetrahedronBufferGeometry(BufferGeometry):
    def __init__(self, vertices, **kwargs):
        indices = [[0,1,2],
            [0,3,1],
            [0,2,3],
            [3,2,1]]
        BufferGeometry.__init__(self, vertices=vertices, indices=indices, **kwargs)


class PlaneBufferGeometry(Three):
    def __init__(self, name=None, width=1, height=1, widthSegments=1, heightSegments=1):
        Three.__init__(self, name)
        self.width = width
        self.height = height
        self.widthSegments = widthSegments
        self.heightSegments = heightSegments
    def json(self):
        d = Three.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k not in d})
        return d


class SphereBufferGeometry(Three):
    def __init__(self, name=None, radius=50, widthSegments=8, heightSegments=6, phiStart=0, phiLength=2*np.pi, thetaStart=0, thetaLength=2*np.pi):
        Three.__init__(self, name)
        self.radius = radius
        self.widthSegments = widthSegments
        self.heightSegments = heightSegments
        self.phiStart = phiStart
        self.phiLength = phiLength
        self.thetaStart = thetaStart
        self.thetaLength = thetaLength
    def json(self):
        d = Three.json(self)
        d.update({k: v for k, v in self.__dict__.items() if k not in d and v is not None})
        return d


def scene_gen(length=20, width=20, height=20, **kwargs):
    L, W, H = length, width, height
    images = []
    textures = []
    materials = [MeshPhongMaterial(side=FrontSide, shading=FlatShading, color=color) for color in [0xaaffff,
        0xffffaa, 0xffaaff, 0xffaaaa, 0xaaffaa, 0xaaaaff]]
    geometries = []
    
    scene = Scene()
    scene.add(AmbientLight(color=0x151515))

    pointLight = PointLight(color=0x777777, intensity=0.6, distance=40,
        position=[0,2.5,-4])
    scene.add(pointLight);
    
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

    return scene.export() #, geometries=geometries, materials=materials, textures=textures, images=images)


if __name__ == "__main__":
    filename = "untitled.json"
    if len(sys.argv) == 2:
        filename = sys.argv[1]
    scene = scene_gen(length=50, width=50, height=25)
    print(json.loads(json.dumps(scene['object'], indent=2)))
    pathname = os.path.join(os.getcwd(), "static", "models", filename)
    if len(sys.argv) == 2:
        inc = 0
        while (os.path.exists(pathname)):
            pathname = os.path.join(os.getcwd(), "static", "models", "%s_%d%s" % (os.path.splitext(filename)[0],
                inc,
                os.path.splitext(filename)[1]))
            inc += 1
    with open(pathname, 'w') as f:
        f.write(json.dumps(scene, indent=2))
    print("wrote %s" % pathname)








# class PlaneGeometry(Three):
#     def __init__(self, width=1, height=1, widthSegments=1, heightSegments=1, name=None):
#         Three.__init__(self, name)
#         self.width = width
#         self.height = height
#         self.widthSegments = widthSegments
#         self.heightSegments = heightSegments
#     def json(self):
#         d = Three.json(self)
#         d.update({"metadata": {"type": "PlaneGeometry",
#                                "version": 4},
#                   "width": self.width,
#                   "height": self.height,
#                   "widthSegments": self.widthSegments,
#                   "heightSegments": self.heightSegments})
#         return d

# class Geometry(Three):
#     def __init__(self, vertices=None, indices=None, normals=None, uvs=None, name=None):
#         Three.__init__(self, name)
#         if vertices:
#             self.vertices = vertices
#         if indices:
#             self.indices = indices
#         if normals:
#             self.normals = normals
#         if uvs:
#             self.uvs = uvs
#     def json(self):
#         d = Three.json(self)
#         d.update({"metadata": {"type": "Geometry",
#                                "version": 4},
#                   "type": "Geometry"})
#         d.update({k: v for k, v in self.__dict__.items()
#                   if k in ('vertices', 'normals', 'uvs', 'indices')})
#         return d

# class CylinderGeometry(Three):
#     def __init__(self, radiusTop=1, radiusBottom=1, height=1, radiusSegments=8, heightSegments=1, openEnded=False, thetaStart=0, thetaLength=2*np.pi, name=None):
#         Three.__init__(self, name)
#         self.radiusTop = radiusTop
#         self.radiusBottom = radiusBottom
#         self.height = height
#         self.radiusSegments = radiusSegments
#         self.heightSegments = heightSegments
#         self.openEnded = openEnded
#         self.thetaStart = thetaStart
#         self.thetaLength = thetaLength
#     def json(self):
#         d = Three.json(self)
#         d.update({"type": "CylinderGeometry"})
#         d.update({k: v for k, v in self.__dict__.iteritems()
#                   if k in ("radiusTop", "radiusBottom", "height", "radiusSegments", "heightSegments", "openEnded", "thetaStart", "thetaLength")})
#         return d




    # box = Box(vertices=np.array([[0,0,0], [1,0,0], [1,0,1], [0,0,1], [0,1,0], [1,1,0], [1,1,1], [0,1,1]]) - 0.5 * np.ones(3),
    #     inward_normals=False)
    # geometries.append(box)
    # materials.append(MeshPhongMaterial(side=FrontSide, color=0x00ff00, shading=FlatShading))
    # mesh = Mesh(name="box", geometry=box, material=materials[-1], position=[0,0,-3],
    #     userData={'cannonData': {
    #         'mass': 0.5,
    #         'shapes': ['Box']
    #     }})
    # scene.add(mesh)


    # tetra = Tetrahedron(vertices=np.array([[0,0,0], [1,0,0], [1,0,1], [0,1,0]]))
    # geometries.append(tetra)
    # materials.append(MeshPhongMaterial(side=FrontSide, color=0x0000ff, shading=FlatShading))
    # mesh = Mesh(name="tetra", geometry=tetra, material=materials[-1], position=[3,0,-3],
    #     castShadow=True,
    #     userData={'cannonData': {
    #         'mass': 0.5,
    #         'shapes': ['ConvexPolyhedron']
    #     }})
    # scene.add(mesh)


    # geometries.append(SphereBufferGeometry(widthSegments=16, heightSegments=8))
    # mesh = Mesh(name="sphere", geometry=geometries[-1], material=materials[-1], position=[-3,3,-3],
    #     userData={'cannonData': {
    #         'mass': 0.5,
    #         'shapes': ['Sphere']
    #     }})
    # scene.add(mesh)


    # geometries.append(Cylinder(radiusTop=0.25, radiusBottom=0.25, height=1, radialSegments=8))
    # mesh = Mesh(name="cylinder", geometry=geometries[-1], material=materials[-1], position=[-3,3,-3],
    #     castShadow=True,
    #     userData={'cannonData': {
    #         'mass': 0.5,
    #         'shapes': ['Cylinder']
    #     }})
    # scene.add(mesh)
