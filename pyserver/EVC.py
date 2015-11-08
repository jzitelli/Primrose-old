"""Based on Karl Sims, 'Evolving Virtual Creatures'
"""

from networkx import DiGraph # conda install networkx
from three import *


# node attributes: dimensions, joint type, joint limits, recursive limit, neurons
#   joint types: rigid, revolute, twist, universal, bend-twist, twist-bend, spherical
# edge attributes: position, orientation, scale, reflection, terminal only


def construct_phenotype(genotype):
    phenotype = Object3D()
    nodes = genotype.nodes(data=True)
    n_visits = {node[0]: 0 for node in nodes}
    root, rootData = nodes[0]
    phenotype.add(rootData['mesh'])
    return phenotype


def cubesnake():
    pass


if __name__ == "__main__":
    genotype = DiGraph()
    genotype.add_node(0, mesh=Mesh(geometry=BoxGeometry(1,1,1), material=MeshBasicMaterial(color=0xff0000)))
    phenotype = construct_phenotype(genotype)
    print(phenotype.json())
