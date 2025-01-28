set work_path=D:\ManyKit\Minna\trunk\Minna
D:
echo -----------start redis
cd %work_path%\tools\redis64\
start %work_path%\tools\redis64\redis-server.exe

echo -----------start db
cd %work_path%\dbstart
del %work_path%\dbstart\mdata\mongod.lock
start %work_path%\dbstart\mongodb3.2auth.bat

echo -----------start nodejs
cd %work_path%
npm start
exit