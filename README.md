# 3D Web-based Network Sim with WebSockets (using DIS Protocol)
## Requirements
[DIS-Map](https://github.com/mcgredonps/DIS_Map)
## Running Sim
Run DIS-Map which starts websocket server receiving and multicasting DIS messages.

Run a webserver on the local folder of "index.html".

An example of python with http.server module:
Type
`py -m http.server` in the local folder of "index.html".

Open the web browser and go to "localhost:8000".

Open another **window** and go to "localhost:8000/index_remote.html".

## Things to improve
Fire PDU

Single Player Controls, and markings (naming tank in remote app is done, color info must be included)

Disconnect timeout and dead tanks

Enemy only on the server
