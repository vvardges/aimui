import os
from aimrecords import Storage
import json

from app.projects.utils import get_project_branches, get_branch_commits
from app.db import db
from app.commits.models import Commit, Tag
from artifacts.artifact import Metric


PROJECT_PATH = '/store'


def get_run_objects_path(b, c):
    return os.path.join(b, c, 'objects')


def get_runs_hashes(tag=None, experiments=None, params=None):
    project_branches = get_project_branches(PROJECT_PATH)

    # Filter by experiments
    if experiments and isinstance(experiments, str):
        experiments = filter(lambda e: e,
                             map(lambda e: e.strip(), experiments.split(',')))
        project_branches = [e for e in experiments if e in project_branches]

    # Get all commit objects
    commit_objects = {}
    for branch in project_branches:
        branch_path = os.path.join(PROJECT_PATH, branch)
        branch_commits = get_branch_commits(branch_path)
        for c in branch_commits.values():
            commit_objects[c['hash']] = {
                'branch': branch,
                'hash': c['hash'],
                'date': c['date'],
                'msg': c['message'],
            }

    # Filter by tag
    commit_hashes_by_tag = set()
    if tag is not None:
        tags = Tag.query.filter(Tag.name.like('{}%'.format(tag))).all()
        for t in tags:
            for tag_commit in t.commits:
                commit_hashes_by_tag.add(tag_commit.hash)

        filtered_runs = {c_hash: commit_objects[c_hash]
                         for c_hash in commit_hashes_by_tag}
    else:
        filtered_runs = commit_objects

    # Filter by params
    if params is not None:
        i = 0
        while i < len(filtered_runs):
            c_hash, c_obj = list(filtered_runs.items())[i]
            branch_path = os.path.join(PROJECT_PATH, c_obj['branch'])
            c_path = get_run_objects_path(branch_path, c_hash)
            dict_path = os.path.join(c_path, 'map', 'dictionary.log')
            if os.path.isfile(dict_path):
                try:
                    with open(dict_path, 'r') as c_config_file:
                        c_params = json.loads((c_config_file.read() or '')
                                              .strip())
                        c_params_flat = {}
                        for namespace, sub_params in c_params.items():
                            for sub_k, sub_v in sub_params.items():
                                c_params_flat[sub_k] = sub_v

                        matched = True
                        for s_param_k, s_param in params.items():
                            val = s_param['value']
                            if s_param_k not in c_params_flat \
                                or str(c_params_flat[s_param_k]) != str(val):
                                matched = False
                                break
                        if matched:
                            i += 1
                            continue
                except:
                    pass
            del filtered_runs[c_hash]

    return filtered_runs


def get_runs_metric(metric, tag=None, experiments=None, params=None):
    if not metric:
        return {}

    filtered_runs = get_runs_hashes(tag, experiments, params)

    # Get commits data length
    max_commit_len = 0
    for commit_hash, commit in filtered_runs.items():
        branch_path = os.path.join(PROJECT_PATH, commit['branch'])
        storage_path = get_run_objects_path(branch_path, commit['hash'])
        records_storage = Storage(storage_path, 'r')
        try:
            records_storage.open(metric,
                                 uncommitted_bucket_visible=True)
            commit['num_steps'] = records_storage.get_records_num(metric)
            records_storage.close()
        except:
            commit['num_steps'] = 0
        if commit['num_steps'] > max_commit_len:
            max_commit_len = commit['num_steps']

    # Get commits data
    scaled_steps_len = 50
    if scaled_steps_len > max_commit_len:
        scaled_steps_len = max_commit_len
    if scaled_steps_len:
        scaled_steps = slice(0, max_commit_len,
                             max_commit_len // scaled_steps_len)
    else:
        scaled_steps = slice(0, 0)

    # Retrieve actual values from commits
    for commit_hash, commit in filtered_runs.items():
        branch_path = os.path.join(PROJECT_PATH, commit['branch'])
        storage_path = get_run_objects_path(branch_path, commit['hash'])
        commit['data'] = []
        records_storage = Storage(storage_path, 'r')
        try:
            records_storage.open(metric,
                                 uncommitted_bucket_visible=True)
            for r in records_storage.read_records(metric,
                                                  scaled_steps):
                base, metric_record = Metric.deserialize(r)
                commit['data'].append({
                    'value': metric_record.value,
                    'step': base.step,
                    'epoch': base.epoch if base.has_epoch else None,
                })
            records_storage.close()
        except:
            pass

    # Remove empty commits
    filtered_runs = {c_hash: filtered_runs[c_hash]
                     for c_hash in filtered_runs.keys()
                     if len(filtered_runs[c_hash]['data']) > 0}

    # Get tags and colors
    commit_models = db.session.query(Commit, Tag) \
        .join(Tag, Commit.tags) \
        .filter(Commit.hash.in_(filtered_runs.keys())).all()
    for i in commit_models:
        if len(i) <= 1 or not i[1].color:
            continue

        commit_model = i[0]
        commit_tag = i[1]
        for commit_hash, commit in filtered_runs.items():
            if commit_hash == commit_model.hash:
                commit['color'] = commit_tag.color
                commit['tag'] = commit_tag.name

    return filtered_runs


def get_runs_dictionary(tag=None, experiments=None):
    filtered_runs = get_runs_hashes(tag, experiments)
    runs_dicts = {}

    for commit_hash, commit in filtered_runs.items():
        runs_dicts[commit_hash] = {
            'data': {},
        }
        branch_path = os.path.join(PROJECT_PATH, commit['branch'])
        storage_path = get_run_objects_path(branch_path, commit['hash'])
        dict_file_path = os.path.join(storage_path, 'map', 'dictionary.log')
        if os.path.isfile(dict_file_path):
            try:
                with open(dict_file_path, 'r') as dict_file:
                    json_content = (dict_file.read() or '').strip()
                    runs_dicts[commit_hash]['data'] = json.loads(json_content)
            except:
                pass

    return runs_dicts


def parse_query(query):
    sub_queries = query.split(' ')
    metric = tag = experiment = params = None
    for sub_query in sub_queries:
        if 'metric' in sub_query:
            _, _, metric = sub_query.rpartition(':')
            metric = metric.strip()

        if 'tag' in sub_query:
            _, _, tag = sub_query.rpartition(':')
            tag = tag.lower().strip()

        if 'experiment' in sub_query:
            _, _, experiment = sub_query.rpartition(':')
            experiment = experiment.lower().strip()

        if 'experiment' in sub_query:
            _, _, experiment = sub_query.rpartition(':')
            experiment = experiment.lower().strip()

        if 'param' in sub_query:
            if params is None:
                params = {}
            _, _, param = sub_query.rpartition(':')
            if '=' in param:
                param_key, param_op, param_val = param.rpartition('=')
                params[param_key] = {
                    'op': param_op,
                    'key': param_key,
                    'value': param_val,
                }

    return {
        'metric': metric,
        'tag': tag,
        'experiment': experiment,
        'params': params,
    }
