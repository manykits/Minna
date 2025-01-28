export LD_LIBRARY_PATH=./:$LD_LIBRARY_PATH
export LD_PRELOAD=/home/ubuntu/hc/MThing2/trunk/MThing/tools/mongodb-linux/libcrypto.so.1.0.0:/home/ubuntu/hc/MThing2/trunk/MThing/tools/mongodb-linux/libssl.so.1.0.0
/home/ubuntu/hc/MThing2/trunk/MThing/tools/mongodb-linux/bin/mongod --auth --storageEngine=mmapv1 --dbpath /home/ubuntu/hc/MThing2/trunk/MThing/dbstart/mdata
