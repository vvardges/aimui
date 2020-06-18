import os

from flask import Blueprint, send_from_directory
from flask_restful import Api, Resource


general_bp = Blueprint('general', __name__)
general_api = Api(general_bp)


@general_api.resource('/')
class HelloApi(Resource):
    def get(self):
        return 'hello!'


@general_api.resource('/static/<exp_name>/<commit_hash>/media/images/<path>')
class ServeImages(Resource):
    def get(self, exp_name, commit_hash, path):
        images_dir = os.path.join('/store',
                                  exp_name, commit_hash,
                                  'objects', 'media', 'images')
        return send_from_directory(images_dir, path)
