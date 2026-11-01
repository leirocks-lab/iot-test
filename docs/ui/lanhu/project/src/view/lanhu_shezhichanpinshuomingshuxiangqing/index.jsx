'use strict';

import React, { Component } from 'react';
import { Switch, NavBar, Checkbox, Radio, Input, Tabs, TabBar, Badge } from 'antd-mobile';

import styles from './assets/index.module.css';

const print = function (value) {};
class DDS_lanhupage_0 extends Component {
  state = {};
  setValue(val) {}
  render() {
    return (
      <div className={`${styles.page} flex-col`}>
        <div className={`${styles['group_1']} flex-col`}>
          <div className={`${styles['box_1']} flex-row`}>
            <span className={`${styles['text_1']}`}>9:28</span>
            <img
              className={`${styles['thumbnail_1']}`}
              src={
                require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
              }
            />
            <img
              className={`${styles['thumbnail_2']}`}
              src={
                require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
              }
            />
            <img
              className={`${styles['image_1']}`}
              src={
                require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
              }
            />
          </div>
          <div className={`${styles['box_2']} flex-row`}>
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/dfa048c0e7cf426793a0b0d4338c5344_mergeImage.png')
                }
              />
              <div className={`${styles['text-group_1']} flex-row`}>
                <span className={`${styles['text_2']}`}>示例</span>
                <span className={`${styles['text_3']}`}>Air&nbsp;Conditioner产品说明书</span>
              </div>
            </div>
          </div>
        </div>
        <img
          className={`${styles['image_2']}`}
          src={
            require('./assets/img/SketchPng1153e1a4a3b6315ce401d3e6232d3edd69e19fa132ddd8f9bbfde2d47ea4e137.png')
          }
        />
        <div className={`${styles['group_2']} flex-col`}>
          <div className={`${styles['image-wrapper_1']} flex-row justify-between`}>
            <img
              className={`${styles['label_2']}`}
              src={
                require('./assets/img/SketchPngdd96a52f60147d4ca71ba2e4b4452a39408896901732471c36bf66e222a2e023.png')
              }
            />
            <img
              className={`${styles['label_3']}`}
              src={
                require('./assets/img/SketchPng5c230ffddee5e77c93ef3448b147960d7f82d13afca3e9014d88013c80bfa992.png')
              }
            />
          </div>
        </div>
        <img
          className={`${styles['image_3']}`}
          src={
            require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
          }
        />
      </div>
    );
  }
}
export default DDS_lanhupage_0;
