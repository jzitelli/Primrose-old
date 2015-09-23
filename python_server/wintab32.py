"""
Another implementation / good reference:
https://bitbucket.org/pyglet/pyglet/src/f388bbe83f4e59079be1329eb61761adcc7f646c/pyglet/input/wintab.py?at=default&fileviewer=file-view-default
"""

import ctypes
from ctypes import wintypes, c_char, c_int, POINTER
from ctypes.wintypes import HWND, UINT, DWORD, LONG, HANDLE, BOOL, LPVOID

dll = ctypes.WinDLL("wintab32.dll")

HCTX = HANDLE
WTPKT = DWORD
FIX32 = DWORD

class LOGCONTEXTA(ctypes.Structure):
	_fields_ = [
		('lcName', 40*c_char),
		('lcOptions', UINT),
		('lcStatus', UINT),
		('lcLocks', UINT),
		('lcMsgBase', UINT),
		('lcDevice', UINT),
		('lcPktRate', UINT),
		('lcPktData', WTPKT),
		('lcPktMode', WTPKT),
		('lcMoveMask', WTPKT),
		('lcBtnDnMask', DWORD),
		('lcBtnUpMask', DWORD),
		('lcInOrgX', LONG),
		('lcInOrgY', LONG),
		('lcInOrgZ', LONG),
		('lcInExtX', LONG),
		('lcInExtY', LONG),
		('lcInExtZ', LONG),
		('lcOutOrgX', LONG),
		('lcOutOrgY', LONG),
		('lcOutOrgZ', LONG),
		('lcOutExtX', LONG),
		('lcOutExtY', LONG),
		('lcOutExtZ', LONG),
		('lcSensX', FIX32),
		('lcSensY', FIX32),
		('lcSensZ', FIX32),
		('lcSysMode', BOOL),
		('lcSysOrgX', c_int),
		('lcSysOrgY', c_int),
		('lcSysExtX', c_int),
		('lcSysExtY', c_int),
		('lcSysSensX', FIX32),
		('lcSysSensY', FIX32)
	]

PK_CONTEXT = 		0x0001	# reporting context */
PK_STATUS = 			0x0002	# status bits */
PK_TIME = 			0x0004	# time stamp */
PK_CHANGED = 		0x0008	# change bit vector */
PK_SERIAL_NUMBER = 0x0010	# packet serial number */
PK_CURSOR = 			0x0020	# reporting cursor */
PK_BUTTONS = 		0x0040	# button information */
PK_X = 				0x0080	# x axis */
PK_Y = 				0x0100	# y axis */
PK_Z = 				0x0200	# z axis */
PK_NORMAL_PRESSURE = 0x0400	# normal or tip pressure */
PK_TANGENT_PRESSURE = 0x0800	# tangential or barrel pressure */
PK_ORIENTATION = 	0x1000	# orientation info: tilts */
PK_ROTATION = 		0x2000	# rotation info; 1.1 */

lcPktData = (PK_CHANGED | PK_CURSOR | PK_BUTTONS | PK_X | PK_Y | PK_NORMAL_PRESSURE)
lcPktMode = 0

class PACKET(ctypes.Structure):
	_fields_ = [
		('pkChanged', WTPKT),
		('pkCursor', UINT),
		('pkButtons', DWORD),
		('pkX', LONG),
		('pkY', LONG),
		('pkNormalPressure', UINT)
	]

dll.WTInfoA.argtypes = [UINT, UINT, POINTER(LOGCONTEXTA)]
dll.WTInfoA.restype = UINT

dll.WTOpenA.argtypes = [HWND, POINTER(LOGCONTEXTA), BOOL]
dll.WTOpenA.restype = HCTX

dll.WTClose.argtypes = [HCTX]
dll.WTClose.restype = BOOL

dll.WTPacketsGet.argtypes = [HCTX, c_int, POINTER(PACKET)]
dll.WTPacketsGet.restype = c_int

dll.WTPacket.argtypes = [HCTX, UINT, POINTER(PACKET)]
dll.WTPacket.restype = BOOL

WTI_DEFCONTEXT = 3

lc = LOGCONTEXTA()
stat = dll.WTInfoA(WTI_DEFCONTEXT, 0, lc);
lc.lcPktData = lcPktData
lc.lcPktMode = lcPktMode

CXO_SYSTEM = 0x0001
CXO_PEN = 0x0002
CXO_MESSAGES = 0x0004
CXO_MARGIN = 0x8000

#lc.lcOptions = (CXO_SYSTEM | CXO_PEN | CXO_MESSAGES)

hwnd = 668
cMaxPkts = 20
buf = (cMaxPkts*PACKET)()
hctx = None

def open():
	global hctx
	hctx = dll.WTOpenA(HWND(hwnd), lc, True)
	return hctx

def read():
	n = dll.WTPacketsGet(hctx, cMaxPkts, buf)
	return (n, buf)

def close():
	return dll.WTClose(hctx)


if __name__ == "__main__":
	while True:
		n, buf = read()
		if pkt is not None:
			print("%d %d %f" % (pkt.pkX, pkt.pkY, pkt.pkNormalPressure / 1023.0))
