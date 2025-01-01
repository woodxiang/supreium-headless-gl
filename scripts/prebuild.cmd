echo on

set CURRENT_DIR=%CD%
cd %~dp0\..\prebuilds
7z e -y *.gz

for %%i in (93,108, 115, 127) do (
  7z e -y *%%i*.tar 
  move /y webgl.node win32-x64\node.abi%%i.node
)

del *.tar
del *.gz

cd %CURRENT_DIR%