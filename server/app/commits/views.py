import json
import os
import time

from flask import Blueprint, jsonify, request, \
    abort, make_response, send_from_directory
from flask_restful import Api, Resource

from app import App
from app.commits.models import Commit, Tag
from app.commits.utils import get_runs_metric, get_runs_dictionary, parse_query
from services.executables.action import Action
from app.db import db


commits_bp = Blueprint('commits', __name__)
commits_api = Api(commits_bp)


@commits_api.resource('/search/metric')
class CommitMetricSearchApi(Resource):
    def get(self):
        query = request.args.get('q').strip()
        parsed_query = parse_query(query)

        metrics = parsed_query['metrics']
        tag = parsed_query['tag']
        experiment = parsed_query['experiment']
        params = parsed_query['params']

        commits = get_runs_metric(metrics, tag, experiment, params)

        return jsonify(commits)


@commits_api.resource('/search/dictionary')
class CommitDictionarySearchApi(Resource):
    def get(self):
        query = request.args.get('q').strip()
        parsed_query = parse_query(query)

        tag = parsed_query['tag']
        experiment = parsed_query['experiment']

        dicts = get_runs_dictionary(tag, experiment)

        return jsonify(dicts)


@commits_api.resource('/tags/<commit_hash>')
class CommitTagApi(Resource):
    def get(self, commit_hash):
        commit = Commit.query.filter(Commit.hash == commit_hash).first()

        if not commit:
            return make_response(jsonify({}), 404)

        commit_tags = []
        for t in commit.tags:
            commit_tags.append({
                'id': t.uuid,
                'name': t.name,
                'color': t.color,
            })

        return jsonify(commit_tags)


@commits_api.resource('/tags/update')
class CommitTagUpdateApi(Resource):
    def post(self):
        form = request.form

        commit_hash = form.get('commit_hash')
        experiment_name = form.get('experiment_name')
        tag_id = form.get('tag_id')

        commit = Commit.query.filter((Commit.hash == commit_hash) &
                                     (Commit.experiment_name == experiment_name)
                                     ).first()
        if not commit:
            commit = Commit(commit_hash, experiment_name)
            db.session.add(commit)
            db.session.commit()

        tag = Tag.query.filter(Tag.uuid == tag_id).first()
        if not tag:
            return make_response(jsonify({}), 404)

        if tag in commit.tags:
            commit.tags.remove(tag)
        else:
            for t in commit.tags:
                commit.tags.remove(t)
            commit.tags.append(tag)

        db.session.commit()

        return {
            'tag': list(map(lambda t: t.uuid, commit.tags)),
        }


@commits_api.resource('/info/<experiment>/<commit_hash>')
class CommitInfoApi(Resource):
    def get(self, experiment, commit_hash):
        commit_path = os.path.join('/store', experiment, commit_hash)

        if not os.path.isdir(commit_path):
            return make_response(jsonify({}), 404)

        commit_config_file_path = os.path.join(commit_path, 'config.json')
        info = {}

        try:
            with open(commit_config_file_path, 'r+') as commit_config_file:
                info = json.loads(commit_config_file.read())
        except:
            pass

        process = info.get('process')
        if process:
            if not process['finish']:
                if process.get('start_date'):
                    process['time'] = time.time() - process['start_date']
                else:
                    process['time'] = None

                # Get PID
                action = Action(Action.SELECT, {
                    'experiment': experiment,
                    'commit_hash': commit_hash,
                })
                processes_res = App.executables_manager.add(action, 30)
                if processes_res is not None and 'processes' in processes_res:
                    processes = json.loads(processes_res)['processes']
                    if len(processes):
                        process['pid'] = processes[0]['pid']

        return jsonify(info)
