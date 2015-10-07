/* global Primrose */

Primrose.Input.Mouse = ( function () {

  function isPointerLocked () {
    return !!( document.pointerLockElement ||
        document.webkitPointerLockElement ||
        document.mozPointerLockElement );
  }

  function MouseInput ( name, DOMElement, commands, socket, oscope ) {
    DOMElement = DOMElement || window;
    Primrose.Input.ButtonAndAxis.call( this, name, commands, socket,
        oscope, 1, MouseInput.AXES );

    this.setLocation = function ( x, y ) {
      this.setAxis( "X", x );
      this.setAxis( "Y", y );
    };

    this.setMovement = function ( dx, dy ) {
      this.setAxis( "X", dx + this.getAxis( "X" ) );
      this.setAxis( "Y", dy + this.getAxis( "Y" ) );
    };

    this.readEvent = function ( event ) {
      if ( isPointerLocked() ) {
        this.setMovement(
            event.webkitMovementX || event.mozMovementX || event.movementX ||
            0,
            event.webkitMovementY || event.mozMovementY || event.movementY ||
            0 );
      }
      else {
        this.setLocation( event.clientX, event.clientY );
      }
    };

    DOMElement.addEventListener( "mousedown", function ( event ) {
      this.setButton( event.button, true );
      this.readEvent( event );
    }.bind( this ), false );

    DOMElement.addEventListener( "mouseup", function ( event ) {
      this.setButton( event.button, false );
      this.readEvent( event );
    }.bind( this ), false );

    DOMElement.addEventListener( "mousemove", this.readEvent.bind( this ),
        false );

    DOMElement.addEventListener( "mousewheel", function ( event ) {
      this.setAxis( "Z", this.getAxis( "Z" ) + event.wheelDelta );
      this.readEvent( event );
    }.bind( this ), false );

  }

  MouseInput.AXES = [ "X", "Y", "Z" ];
  Primrose.Input.ButtonAndAxis.inherit( MouseInput );
  return MouseInput;
} )();
