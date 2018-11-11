import React from 'react';
import { inject, observer } from 'mobx-react';
import './lotteryPlate.styl';
import PlayTabs from './PlayTabs';
import TipAndHot from './TipAndHot';
import Plate from './Plate';
import BetOption from './BetOption';

@inject('lotteryStore')
@observer
class LotteryPlate extends React.Component {
    render() {
        const { activeTab, setBetOptionRef } = this.props.lotteryStore;
        if (!activeTab) {
            return null;
        }
        return (
            <div className="lottery-plate-wrapper">
                <PlayTabs />
                <TipAndHot />
                <Plate />
                <BetOption ref={ref => setBetOptionRef(ref)} />
            </div>
        );
    }
}

export default LotteryPlate;