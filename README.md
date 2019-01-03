# 3D Web-based Network Sim with WebSockets (using DIS Protocol)
## Requirements
Either clone and compile the [DIS-Map](https://github.com/mcgredonps/DIS_Map) repository.

Or try [compiled DIS-Map](https://drive.google.com/open?id=1CRl7q_NvQ7hJV-PYNZmWjaGsR-IrJ0Xs) version ([second link](https://www.dropbox.com/s/wewfdabb167wsbv/dismap-dist.rar?dl=0)) by typing `java -jar ./DISMap.jar`. 
## Running Sim
Run DIS-Map which starts websocket server receiving and multicasting DIS messages.

Run a webserver on the local folder of "index.html".

An example of python with http.server module:
Type
`py -m http.server` in the local folder of "index.html".

Open the web browser and go to "localhost:8000".

Open another **window** and go to "localhost:8000/index_remote.html".

## Things to improve
Fire PDU, missile will be animation whereas detonation will be broadcast over the network..

Single Player Controls, and markings (name tanks! how to send it over network?, color info must be included)

Assess damage and draw health bars according to these messages

