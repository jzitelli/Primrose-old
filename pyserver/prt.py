"""Precomputed Radiance Transfer"""

import scipy.ndimage as ndimage
import numpy as np
import matplotlib.pyplot as plt

def compute_irradiance_diffuse(cube_images=None):
	for image in cube_images:
		image = ndimage.imread(image)
		plt.figure()
		plt.imshow(image);


if __name__ == "__main__":
	plt.ion()
	compute_irradiance_diffuse(["images/SwedishRoyalCastle/%s.jpg" % p
		                        for p in ['nx', 'px', 'ny', 'py', 'nz', 'pz']])
