import os


class Project:
    def __init__(self):
        self.name = os.getenv('PROJECT_NAME') or ''
        self.description = ''

    def exists(self):
        return True
