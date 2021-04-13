from importlib import import_module
import os


class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


def get_module(name, required=True):
    try:
        return import_module(name)
    except Exception:
        if required:
            raise ValueError('No module named: \'{}\''.format(name))
        return None


def ls_dir(path):
    """
    List the files in directories
    """
    if not path or not os.path.exists:
        return []

    if os.path.isfile(path):
        return [path]

    ls = []

    for root, _, file_names in os.walk(path):
        for file_name in file_names:
            ls.append(os.path.join(root, file_name))

    return ls
