import unittest
from unittest import TestCase

import os
import json
import logging
_logger = logging.getLogger(__name__)

import json
import jsonschema
import git

import editor3d


class JSONSchemaTest(TestCase):

    def test_scene_schema(self):
        filename = "default_scene.json"
        with open(os.path.join("data", filename), 'r') as f:
            instance = json.loads(f.read())
        _logger.debug("validating JSON data:\n%s" % json.dumps(instance, indent=2))
        jsonschema.validate(instance, editor3d.SCENE_SCHEMA)


# class GitPythonTest(TestCase):

#     def test_repo(self):
#         cwd = os.getcwd()
#         repo = git.Repo(os.path.join(cwd, os.path.pardir, os.path.pardir))
#         commits = list(repo.iter_commits())
#         trees = list(repo.iter_trees())


class FlaskTest(TestCase):

    def setUp(self):
        editor3d.app.config['TESTING'] = True
        self.app = editor3d.app.test_client()

    def test_index(self):
        response = self.app.get('/')
        self.assertEqual(response.status_code, 200)

    def test_tour(self):
        response = self.app.get('/tour')
        self.assertEqual(response.status_code, 200)

    def test_configured(self):
        response = self.app.get('/config')
        self.assertEqual(response.status_code, 200)

    def test_git_url(self):
        response = self.app.get('/git_url')
        self.assertEqual(response.status_code, 200)

    def test_read(self):
        filename = "editor3d.js"
        with open(filename, 'r') as f:
            value = f.read()
        response = self.app.get('/read?filename=%s' % filename)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data)['value'], value)

    def test_log(self):
        print 'server should be logging "logtest"...'
        response = self.app.get('/log?string=logtest')
        self.assertEqual(response.status_code, 200)

    def test_python_eval(self):
        response = self.app.get('/python_eval?pystr=value = 4')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.data)['value'], 4)

    def tearDown(self):
        pass  # urllib.urlopen("http://127.0.0.1:5000/shutdown")


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s %(funcName)s %(lineno)d:\n%(message)s\n")
    unittest.main()
