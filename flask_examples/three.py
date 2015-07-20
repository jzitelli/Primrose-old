import json
import uuid


def PlaneBufferGeometry():
	return {"type": "PlaneBufferGeometry"}

def scene_gen(xy_grid=False, **kwargs):
    scene = {"uuid": uuid.uuid4(),
    		 "type": "Scene",
     		 "children": []}
    if (xy_grid):
		scene['children'].append(PlaneBufferGeometry())
    return json.dumps({"object": scene,
    	               "geometries": [],
    	"materials": [],
    	"images": []})


if __name__ == "__main__":
	filename = "models/ConfigUtilDeskScene.json"
	scene = json.loads(open(filename, 'r').read())
	scene['object']['uuid'] = unicode(uuid.uuid4())

	children = scene['object']['children']

	images = scene['images']
	images[0]['url'] = "ConfigUtilDeskScene.png"

	textures = scene['textures']

	materials = scene['materials']
	materials[0]['uuid'] = unicode(uuid.uuid4())

	geometries = scene['geometries']
	geometries[0]['uuid'] = unicode(uuid.uuid4())

	mesh = scene['object']['children'][-1]
	mesh['geometry'] = geometries[0]['uuid']
	mesh['material'] = materials[0]['uuid']
	mesh['uuid'] = unicode(uuid.uuid4())
	mesh['matrix'] = [0.01,0,0,0,
	0,0.01,0,0.5,
	0,0,0.01,-1,
	0,0,0,1]

	with open(filename, 'w') as f:
		f.write(json.dumps(scene))

	print("wrote ", filename)
