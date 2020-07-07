import os
from aimrecords import Storage
import json

from app.projects.utils import get_project_branches, get_branch_commits
from app.db import db
from app.commits.models import Commit, Tag
from artifacts.artifact import Metric


PROJECT_PATH = '/store'


def run_storage_path(b, c):
    return os.path.join(b, c, 'objects')


def get_runs_hashes(tag=None, experiments=None):
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

    return filtered_runs


def get_runs_metric(metric, tag=None, experiments=None):
    filtered_runs = get_runs_hashes(tag, experiments)

    # Get commits data length
    max_commit_len = 0
    for commit_hash, commit in filtered_runs.items():
        branch_path = os.path.join(PROJECT_PATH, commit['branch'])
        storage_path = run_storage_path(branch_path, commit['hash'])
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
        storage_path = run_storage_path(branch_path, commit['hash'])
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
        storage_path = run_storage_path(branch_path, commit['hash'])
        dict_file_path = os.path.join(storage_path, 'map', 'dictionary.log')
        if os.path.isfile(dict_file_path):
            try:
                with open(dict_file_path, 'r') as dict_file:
                    json_content = (dict_file.read() or '').strip()
                    runs_dicts[commit_hash]['data'] = json.loads(json_content)
            except:
                pass

    return runs_dicts
