import sys
from collections import namedtuple
import json
import xml.etree.ElementTree as ET  # fuck E.T.
import numpy as np
from stl import stl  # pip install numpy-stl

def xml_to_primrose(xmlfile, jsonfile):
    primrose = {
        "object": {
            "type": "Scene",
            "children": [{"type": "PerspectiveCamera",
                          "name": "Camera",
                          "matrix": [-0.685881, -0.010817, 0.727634, 0, 0.31737, 0.895343, 0.312469, 0, -0.654862, 0.445245, -0.610666, 0, -14.9614, 6.0255, -13.0155, 1],
                          "visible": True,
                          "far": 1000,
                          "near": 0.1,
                          "aspect": 1.77778,
                          "fov": 75},
                         {"type": "PointLight",
                          "name": "Lamp",
                          "matrix": [0.629609, -0.119463, 2.06758, 0, 1.36148, 1.06737, -0.352921, 0, -0.848303, 1.1902, 0.327091, 0, 0, 12, 0, 1],
                          "visible": True,
                          "color": 16777215,
                          "intensity": 1,
                          "distance": 30
                         }],
            "matrix": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]},
        "geometries": [],
        "materials": [{
            "type": "MeshLambertMaterial",
            "uuid": "9EAFE12A-3FB5-3914-900C-71B23623DBB4",
            "color": 10724259
            }],
        "textures": [],
        "images": []
    }
    root = ET.parse(xmlfile).getroot()
    textures = root.findall("./textures/texture")
    for texture in textures:
        primrose['images'].append(
            {
        "uuid": "D2EAE71C-6750-3473-ADB2-8EDECF30F18A",
        "url": "flask_examples/models/ConfigUtilDeskScene.png",
        "name": "ConfigUtilDeskScene.png"
        })

        primrose['textures'].append(
            {"uuid": "E195B076-AF30-3628-BCA8-FB4324E79CED",
             "minFilter": "LinearMipMapLinearFilter",
             "name": "DeskTexture",
             "magFilter": "LinearFilter",
             "image": primrose['images'][-1]['uuid'],
             "anisotropy": 1,
             "mapping": "UVMapping"
    })

        primrose['materials'].append({
            "type": "MeshBasicMaterial",
            "uuid": "9EAFE12A-3FB5-3914-900C-71B23623DBB6",
            "map": primrose['textures'][-1]['uuid']
            })

    models = root.findall("./models/model")
    for model in models:
        vertices = np.fromstring(
            model.find("vertices").text, sep=' ').reshape((-1, 3))
        normals = np.fromstring(
            model.find("normals").text, sep=' ').reshape((-1, 3))
        indices = np.fromstring(
            model.find("indices").text, sep=' ', dtype=int).reshape((-1, 3))
        uv = np.fromstring(
            model.find("material/texture").text, sep=' ')

        primrose['geometries'].append(
            {"type": "BufferGeometry",
             "uuid": "9EAFE12A-3FB5-3914-900C-71B23623DBB3",
             "data": {
                "attributes": {
                    "uv": {
                        "type": "Float32Array",
                        "itemSize": 2,
                        "array": list(uv.ravel())
                    },
                    "position": {
                        "type": "Float32Array",
                        "itemSize": 3,
                        "array": list(vertices.ravel())
                    },
                    "normal": {
                        "type": "Float32Array",
                        "itemSize": 3,
                        "array": list(normals.ravel())
                    },
                    "index": {
                        "type": "Uint32Array",
                        "itemSize": 1,
                        "array": list(indices.ravel())
                    }
                }
            }
        })
        primrose['object']['children'].append(
            {"type": "Mesh",
             "name": "Desk",
             "visible": True,
             "material": primrose['materials'][-1]['uuid'],
             "geometry": primrose['geometries'][-1]['uuid']
            })

    for texture in textures:
        print texture.attrib["fileName"]
    with open(jsonfile, 'w') as f:
        f.write(json.dumps(primrose))


def xml_to_stl(xmlfile, stlfile, models=None):
    root = ET.parse(xmlfile).getroot()
    textures = root.findall("./textures/texture")
    models = root.findall("./models/model")
    dtype = np.dtype([('normals', np.float32, (3, )),
                      ('vectors', np.float32, (3, 3)),
                      ('attr', 'u2', (1, )), ])
    all_data = np.empty(0, dtype=dtype)
    for model in models:
        vertices = np.fromstring(
            model.find("vertices").text, sep=' ').reshape((-1, 3))
        indices = np.fromstring(
            model.find("indices").text, sep=' ', dtype=int).reshape((-1, 3))
        texture = model.find("material/texture")
        data = np.empty(len(indices), dtype=dtype)
        data['vectors'] = np.array(
            [[vertices[tri[i]] for i in (0, 1, 2)] for tri in indices])
        all_data = np.concatenate([all_data, data])
    for texture in textures:
        print texture.attrib["fileName"]
    mesh = stl.StlMesh("Assets/empty.stl")  # stupid
    mesh.data = all_data
    mesh.save(stlfile)


def xml_to_obj(xmlfile, objfile, models=None):
    root = ET.parse(xmlfile).getroot()
    textures = root.findall("./textures/texture")
    models = root.findall("./models/model")
    for model in models:
        pass


def stl_to_xml(stlfile, xmlfile):
    mesh = stl.StlMesh(stlfile)
    scene = ET.Element('scene')
    models = ET.SubElement(scene, 'models', count="1")
    model = ET.SubElement(
        models, 'model', name="stlmodel", isCollisionModel="0")
    vertices = ET.SubElement(model, 'vertices')
    vertices.text = ' '.join(map(str, mesh.vectors.ravel()))
    material = ET.SubElement(model, 'material')
    material.attrib["name"] = "diffuse"
    texture = ET.SubElement(material, 'texture')
    texture.attrib["index"] = '-1'
    normals = ET.SubElement(model, 'normals')
    normals.text = ' '.join(map(str, mesh.normals.ravel()))
    indices = ET.SubElement(model, 'indices')
    indices.text = ' '.join(map(str, range(len(mesh.vectors.reshape(-1, 3)))))
    ET.ElementTree(scene).write(xmlfile)


def xml_to_xml(kxmlfile, oxmlfile):
    global root
    kroot = ET.parse(kxmlfile).getroot()
    kscene = kroot.find("./Object[@Type='Scene']")
    global kmodels
    kmodels = kscene.findall("./Object[@Type='Model']")
    models = []
    Model = namedtuple(
        "Model", ['vertices', 'normals', 'indices', 'color_diffuse'])
    for kmodel in kmodels:
        kmesh = kmodel.find("./Object[@Identifier='Triangular Mesh']")

        kvertex_list = kmesh.find("./Parameter[@Name='Vertex List']")
        vertices = ' '.join([point.attrib['xyz'] for point in kvertex_list])

        knormal_list = kmesh.find("./Parameter[@Name='Normal List']")
        normals = ' '.join([point.attrib['xyz'] for point in knormal_list])

        kindex_list = kmesh.find("./Parameter[@Name='Index List']")
        indices = ' '.join([point.attrib['ijk'] for point in kindex_list])

        kmaterial = kmodel.find("./Object[@Type='Material']")
        color_diffuse = kmaterial.find(
            "./Object[@Identifier='./Diffuse/Constant Texture']/Parameter[@Name='Color']")
        if color_diffuse is not None:
            color_diffuse = color_diffuse.attrib['Value']

        models.append(Model(vertices, normals, indices, color_diffuse))

    oscene = ET.Element('scene')
    omodels = ET.SubElement(oscene, 'models', count="%d" % len(models))
    for model in models:
        omodel = ET.SubElement(omodels, 'model', name="", isCollisionModel="0")
        overtices = ET.SubElement(omodel, 'vertices')
        overtices.text = model.vertices
        onormals = ET.SubElement(omodel, 'normals')
        onormals.text = model.normals
        oindices = ET.SubElement(omodel, 'indices')
        oindices.text = model.indices
    ET.ElementTree(oscene).write(oxmlfile)


def main():
    if len(sys.argv) == 2 and sys.argv[1].endswith(".xml"):
        xmlfile = sys.argv[1]
        jsonfile = xmlfile[:-4] + '.json'
        xml_to_primrose(xmlfile, jsonfile)
        print "wrote", jsonfile

        # stlfile = xmlfile[:-4] + '.stl'
        # xml_to_stl(xmlfile, stlfile)
        # print "wrote", stlfile

    elif len(sys.argv) == 2 and sys.argv[1].endswith(".stl"):
        stlfile = sys.argv[1]
        xmlfile = stlfile[:-4] + '.xml'
        stl_to_xml(stlfile, xmlfile)
        print "wrote", xmlfile

    elif len(sys.argv) == 3 and sys.argv[1].endswith('.xml'):
        kxmlfile = sys.argv[1]
        oxmlfile = sys.argv[2]
        xml_to_xml(kxmlfile, oxmlfile)
        print "wrote", oxmlfile

if __name__ == "__main__":
    main()
