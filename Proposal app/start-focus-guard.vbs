Dim WshShell, q, electronExe, appDir, cmd
Set WshShell = CreateObject("WScript.Shell")
q = Chr(34)
electronExe = "d:\Builds\App\Proposal app\node_modules\electron\dist\electron.exe"
appDir = "d:\Builds\App\Proposal app"
cmd = q & electronExe & q & " " & q & appDir & q
WshShell.Run cmd, 0, False
