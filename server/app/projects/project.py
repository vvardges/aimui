import os


class Project:
    def __init__(self):
        self.name = os.getenv('PROJECT_NAME') or 'Project'
        self.path = os.getenv('PROJECT_PATH') or '/project'
        self.description = ''

    def exists(self):
        return True
