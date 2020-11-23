import os
import json
from copy import deepcopy
from functools import reduce

from file_read_backwards import FileReadBackwards


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
