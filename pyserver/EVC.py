"""Based on Karl Sims, 'Evolving Virtual Creatures'
"""

from networkx import DiGraph # conda install networkx
from three import *


def construct_phenotype(genotype):
	phenotype = Object3D()
	nodes = genotype.nodes(data=True)
	n_visits = {node[0]: 0 for node in nodes}
	root, rootData = nodes[0]
	phenotype.add(rootData['mesh'])
	return phenotype


if __name__ == "__main__":
	genotype = DiGraph()
	genotype.add_node(0, mesh=Mesh(geometry=BoxGeometry(1,1,1), material=MeshBasicMaterial(color=0xff0000)))
	phenotype = construct_phenotype(genotype)
	print(phenotype.json())
