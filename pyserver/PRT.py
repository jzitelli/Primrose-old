"""Precomputed Radiance Transfer"""

import scipy.ndimage as ndimage
import matplotlib.pyplot as plt

def calc_irradiance_diffuse(cube_images):
	"""Calculates diffuse environment irradiance map (as a cube map)"""
	for image in cube_images:
		image = ndimage.imread(image)
		plt.figure()
		plt.imshow(image);


def calc_irradiance_specular(cube_images):
	pass


if __name__ == "__main__":
	plt.ion()
	calc_irradiance_diffuse(["images/skybox/%s.jpg" % p
		                     for p in ['nx', 'px', 'ny', 'py', 'nz', 'pz']])
