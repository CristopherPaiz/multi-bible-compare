import { useState, useRef, useEffect, useContext } from "react";
import ModalStrong from "../components/ModalStrong";
import DICTIONARY from "/diccionario2.png";
import "../styles/Animations.css";
import { useHistoryBlocker } from "../hooks/useHistoryBlocker";
import DataContext from "../context/DataContext";

const FloattingBubble = () => {
  const { modalStrong, strongFun } = useContext(DataContext);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Al hacer clic en un número Strong dentro de un versículo, `strongFun` marca
  // `modalStrong`. Este modal vive aquí, así que hay que abrirlo desde ese aviso
  // en vez de esperar a que el usuario toque la burbuja.
  useEffect(() => {
    if (modalStrong) setIsModalOpen(true);
  }, [modalStrong]);
  const bubbleRef = useRef(null);
  const modalRef = useRef(null);
  const startPosition = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Hook para bloquear la navegación hacia atrás cuando el modal está abierto
  useHistoryBlocker(isModalOpen, () => setIsModalOpen(false));

  const handleMouseDown = (event) => {
    hasMoved.current = false;
    startPosition.current = { x: event.clientX, y: event.clientY };
    startOffset.current = {
      x: bubbleRef.current.offsetLeft,
      y: bubbleRef.current.offsetTop,
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (event) => {
    const deltaX = event.clientX - startPosition.current.x;
    const deltaY = event.clientY - startPosition.current.y;
    if (Math.hypot(deltaX, deltaY) > 5) {
      hasMoved.current = true;
    }

    const newX = startOffset.current.x + deltaX;
    const newY = startOffset.current.y + deltaY;

    const maxX = window.innerWidth - bubbleRef.current.offsetWidth;
    const maxY = window.innerHeight - bubbleRef.current.offsetHeight;

    const boundedX = Math.min(Math.max(0, newX), maxX);
    const boundedY = Math.min(Math.max(0, newY), maxY);

    bubbleRef.current.style.transition = "none";
    bubbleRef.current.style.left = `${boundedX}px`;
    bubbleRef.current.style.top = `${boundedY}px`;
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    if (bubbleRef.current) {
      bubbleRef.current.style.animation = "none";
    }

    if (hasMoved.current) {
      autoMoveToEdgeWithAnimation();
    }
  };

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    hasMoved.current = false;
    startPosition.current = { x: touch.clientX, y: touch.clientY };
    startOffset.current = {
      x: bubbleRef.current.offsetLeft,
      y: bubbleRef.current.offsetTop,
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleTouchMove = (event) => {
    const touch = event.touches[0];
    const deltaX = touch.clientX - startPosition.current.x;
    const deltaY = touch.clientY - startPosition.current.y;
    if (Math.hypot(deltaX, deltaY) > 6) {
      hasMoved.current = true;
    }

    const newX = startOffset.current.x + deltaX;
    const newY = startOffset.current.y + deltaY;

    const maxX = window.innerWidth - bubbleRef.current.offsetWidth - 5;
    const maxY = window.innerHeight - bubbleRef.current.offsetHeight - 5;

    const boundedX = Math.min(Math.max(0, newX), maxX);
    const boundedY = Math.min(Math.max(0, newY), maxY);

    bubbleRef.current.style.transition = "none";
    bubbleRef.current.style.left = `${boundedX}px`;
    bubbleRef.current.style.top = `${boundedY}px`;
  };

  const handleTouchEnd = () => {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);

    if (hasMoved.current) {
      autoMoveToEdgeWithAnimation();
    }
  };

  const [anchorRect, setAnchorRect] = useState(null);

  const handleClickBubble = (e) => {
    e.stopPropagation();
    if (hasMoved.current) return;
    if (bubbleRef.current) {
      setAnchorRect(bubbleRef.current.getBoundingClientRect());
    }
    setIsModalOpen((prev) => !prev);
  };

  const handleModalClose = () => {
    if (bubbleRef.current) {
      setAnchorRect(bubbleRef.current.getBoundingClientRect());
    }
    setIsModalOpen(false);
    strongFun("");
  };

  const autoMoveToEdgeWithAnimation = () => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const bubbleRect = bubble.getBoundingClientRect();
    const screenWidth = window.innerWidth;

    let newX = bubbleRect.left <= screenWidth / 2 ? 0 : screenWidth - bubbleRect.width;

    bubble.style.transition = "left 0.3s";
    bubble.style.left = `${newX}px`;
  };



  return (
    <div>
      <div
        ref={bubbleRef}
        style={{
          position: "fixed",
          top: "22%",
          right: -5,
          width: 60,
          height: 60,
          backgroundColor: "transparent",
          borderRadius: "50%",
          cursor: "pointer",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          userSelect: "none",
          touchAction: "none",
          animation: "float 1s 2 linear",
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={handleClickBubble}
      >
        <div className="bg-transparent absolute size-[60px] rounded-full" />
        <img src={DICTIONARY} className="w-[45px] h-[45px]" />
      </div>
      {isModalOpen && (
        <div ref={modalRef} className="modal-background">
          <ModalStrong isOpen={isModalOpen} onClose={handleModalClose} anchorRect={anchorRect} />
        </div>
      )}
    </div>
  );
};

export default FloattingBubble;
