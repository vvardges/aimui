import services.ws as ws
from services.watcher.file_watcher import FileWatcher


if __name__ == '__main__':
    # Start file watcher
    f = FileWatcher()
    f.start()

    # Start ws server
    ws.start()
