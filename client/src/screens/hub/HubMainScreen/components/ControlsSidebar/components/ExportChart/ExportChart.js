import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import Modal from '../../../../../../../ui/components/Modal/Modal';
import UI from '../../../../../../../ui';
import loaderSrc from '../../../../../../../asset/loader.gif';

function ExportChart () {
  const [imgSrc, setImgSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const openModal = () => {
    setIsModalOpen(true);
    setIsLoading(true);

    html2canvas(document.getElementsByClassName('Panel')[0]).then(function(canvas) {
      const imgSrc = canvas.toDataURL('image/png');
      setImgSrc(imgSrc);
      setIsLoading(false);
    });
  };

  return (<>
    <div className="ControlsSidebar__item" onClick={openModal}>
      <UI.Icon i='file_download' scale={1.7} />
    </div>
    {isModalOpen &&
      <Modal toggle={toggleModal} footer={!isLoading && <a href={imgSrc} download="chart.png">Export PNG</a>}>
        <img src={isLoading ? loaderSrc : imgSrc } width="100%" alt=""/>
      </Modal>
    }
  </>);
}

export default ExportChart;