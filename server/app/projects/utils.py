import os
import json
from copy import deepcopy
from functools import reduce

from file_read_backwards import FileReadBackwards
from app.db import db
from app.commits.models import Commit


def upgrade_runs_table(project, modified_runs):
    for experiment, runs in modified_runs.items():
        for run_hash, run_modified_time in runs:
            run_model = Commit.query.filter(Commit.hash == run_hash).first()

            if not run_model:
                run_model = Commit(run_hash, experiment)
                db.session.add(run_model)

            run_config = project.get_run_config(experiment, run_hash)

            if run_config is not None:
                process = run_config.get('process')
                started_at, finished_at = (process.get('start_date'),
                                           process.get('finish_date'))
                if started_at:
                    run_model.session_started_at = started_at
                if finished_at:
                    run_model.session_closed_at = finished_at

    db.session.commit()


def get_branch_commits(branch_path):
    commits = {}
    for c in os.listdir(branch_path):
        if os.path.isdir(os.path.join(branch_path, c)) and c != 'index':
            commit_config_file_path = os.path.join(branch_path, c,
                                                   'config.json')
            try:
                with open(commit_config_file_path, 'r') as commit_config_file:
                    commit_config = json.loads(commit_config_file.read())
            except:
                commit_config = {}
            commits[c] = commit_config
    return commits


def read_artifact_log(file_path, limit=-1):
    if not os.path.isfile(file_path):
        return []

    content = []
    try:
        with FileReadBackwards(file_path, encoding='utf-8') as file:
            line_index = 0
            for l in file:
                if limit == -1 or line_index <= limit:
                    content = [l] + content

                if limit != -1:
                    line_index += 1
    except:
        pass

    return content


def deep_merge(*dicts, update=False):
    def merge_into(d1, d2):
        for key in d2:
            if key not in d1 or not isinstance(d1[key], dict):
                d1[key] = deepcopy(d2[key])
            else:
                d1[key] = merge_into(d1[key], d2[key])
        return d1

    if update:
        return reduce(merge_into, dicts[1:], dicts[0])
    else:
        return reduce(merge_into, dicts, {})


def dump_dict_values(item, dump_to):
    for k, v in item.items():
        if isinstance(v, dict) and len(v):
            dump_dict_values(v, dump_to)
        else:
            item[k] = dump_to
