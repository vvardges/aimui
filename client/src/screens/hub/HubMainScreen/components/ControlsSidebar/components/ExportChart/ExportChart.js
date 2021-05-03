import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import Modal from '../../../../../../../ui/components/Modal/Modal';
import UI from '../../../../../../../ui';

function ExportChart () {
  const [imgSrc, setImgSrc] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const openModal = () => {
    html2canvas(document.getElementsByClassName('Panel')[0]).then(function(canvas) {
      const img = canvas.toDataURL('image/png');
      setImgSrc(img);
      setIsModalOpen(true);
    });
  };

  return(<>
    <div className="ControlsSidebar__item" onClick={openModal}>
      <UI.Icon i='file_download' scale={1.7} />
    </div>
    {isModalOpen && <Modal
      toggle={toggleModal}
      footer={<a href={imgSrc} download="chart.png">Export PNG</a>}
    >
      <img src={imgSrc} width="100%" alt=""/>
    </Modal>}
  </>);
}

export default ExportChart;