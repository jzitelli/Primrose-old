"""Precomputed Radiance Transfer"""

import scipy.ndimage as ndimage
import numpy as np
import matplotlib.pyplot as plt

def irradiance_maps(cube_images=None):
	for image in cube_images:
		image = ndimage.imread(image)
		plt.figure()
		plt.imshow(image);


if __name__ == "__main__":
	plt.ion()
	irradiance_maps(["images/SwedishRoyalCastle/%s.jpg" % p
		             for p in ['nx', 'px', 'ny', 'py', 'nz', 'pz']])
