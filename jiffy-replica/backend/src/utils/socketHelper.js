let _io = null;
let _userSockets = null;

exports.setIO = (io, userSockets) => {
    _io = io;
    _userSockets = userSockets;
};

exports.getIO = () => _io;

exports.emitToUser = (userId, event, data) => {
    if (!_io || !_userSockets) return;
    const socketId = _userSockets.get(userId);
    if (socketId) {
        _io.to(socketId).emit(event, data);
    }
};

exports.emitToRoom = (room, event, data) => {
    if (!_io) return;
    _io.to(room).emit(event, data);
};
