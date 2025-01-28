set mqtt_work_path=D:/ManyKit/MThing2/trunk/MThing/toolcmds/
D:
echo start mqttserver
cd %mqtt_work_path%/
start ../tools/mosquitto/mosquitto.exe -c mosquitto.conf
exit