import socket
import threading
from threading import RLock
import json
from queue import Queue


HOST = '0.0.0.0'
PORT = 43815
FORMAT = 'utf-8'

store_lock = RLock()


class TrackManager():
    def __init__(self):
        self._server = None
        self._store = {} # {portID : Queue()}
        self._conns = [] # list of open connections
    
    def start(self):
        print("server start tracking")
        self._server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server.bind((HOST, PORT))
        self._server.listen()
        thread = threading.Thread(target=self.start_socket, daemon=True)
        thread.start()

    def start_socket(self):
        while True:
            conn, addr = self._server.accept()
            self._conns.append(conn)
            thread = threading.Thread(target=self.handle_info, args=(conn, addr), daemon=True)
            thread.start()

    def handle_info(self, conn, addr):
        while True:
            data = self.read_line(conn)
            decoded_data = json.loads(data)
            print(decoded_data)
            portID = decoded_data["pid"]
            with store_lock:
                if portID not in self._store:
                    self._store[portID] = Queue()
                else:
                    self._store[portID].put(decoded_data)

    def retrieve(self, portID):
        batch = []
        with store_lock:
            while not self._store[portID].empty():
                batch.append(self._store[portID].get())
        return batch
    
    def shouldRetrieve(self):
        # return a dictionary on what's the current portID and whether the store is empty
        result = {}
        with store_lock:
            for portID in self._store.keys():
                result[portID] = not self._store[portID].empty()
        return result

    def read_line(self, conn):
        # if not self.conn:
        #     return None

        buffer_size = 4096
        buffer = conn.recv(buffer_size).decode('utf-8')
        buffering = True
        while buffering:
            if '\n' in buffer:
                (line, buffer) = buffer.split('\n', 1)
                return line + '\n'
            else:
                more = conn.recv(buffer_size).decode('utf-8')
                if not more:
                    buffering = False
                else:
                    buffer += more
        if buffer:
            return buffer
        return None

    def stop(self):
        # close all open connections
        for conn in self._conns:
            conn.close()
        
        # close the socket
        if self._server:
            self._server.close()
