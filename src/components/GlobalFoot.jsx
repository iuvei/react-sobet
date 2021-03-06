import React from 'react';
import { withRouter } from 'react-router-dom';
import './globalFoot.styl';
import {Link} from 'react-router-dom'
import RightFixed from './RightFixed';
import offsetDis from '../utils/offsetDis';
import setStyle from '../utils/setStyle';

@withRouter
class GlobalFoot extends React.PureComponent {
    state = {
        isLoginPage: false
    }
    rightFixed = null
    copyright = null
    fixedBeside = () => {
        let rightFixedLeft = 0;
        rightFixedLeft = offsetDis(this.copyright).left + 1200 + 80;
        rightFixedLeft = (rightFixedLeft + 80) > window.innerWidth
            ? (window.innerWidth - 80)
            : rightFixedLeft;
        this.rightFixed && setStyle(this.rightFixed, { left: rightFixedLeft });
    }
    componentDidMount() {
        this.fixedBeside();
        window.addEventListener('resize', this.fixedBeside);
        this.props.history.listen(location => {
            if (['/login', '/'].indexOf(location.pathname) !== -1) {
                this.setState({
                    isLoginPage: true
                });
            } else {
                this.setState({
                    isLoginPage: false
                });
            }
        });
        if (['/login', '/'].indexOf(this.props.history.location.pathname) !== -1) {
            this.setState({
                isLoginPage: true
            });
        } else {
            this.setState({
                isLoginPage: false
            });
        }
    }
    render() {
        let login_global_foot=this.state.isLoginPage ? 'login_global_foot':'';
        return (
            <div className={"global-foot "+ login_global_foot}>
                <footer>
                    {
                        this.state.isLoginPage ? null : (
                            <div className="footer-about-wrap">
                                <div className="footer-about">
                                    <div className="logo-bottom"></div>
                                    <ul className="footer-contract-ul clearfix">
                                        <li className="fl">
                                            <a href="tel:00639054515666">
                                                <span>
                                                    <i className="icon-tel"></i>
                                                    &nbsp;+63&nbsp;9054515666
                                        </span>
                                            </a>
                                        </li>
                                        <li className="fl">
                                            <a href="mailto:cs@mc188.com">
                                                <span>
                                                    <i className="icon-email"></i>
                                                    &nbsp;cs@mc188.com
                                        </span>
                                            </a>
                                        </li>
                                    </ul>
                                    <ul className="footer-link-ul clearfix fr">
                                        <li className="fl">
                                            <Link to="/helpercenter#Agent">关于摩臣</Link>
                                        </li>
                                        <li className="fl">
                                            <a
                                                href="/static/sobet/helper-center.html?type=player"
                                                target="_blank"
                                                rel="noopener noreferrer">玩法介绍</a>
                                        </li>
                                        <li className="fl">
                                            <a
                                                href="/static/sobet/helper-center.html"
                                                target="_blank"
                                                rel="noopener noreferrer">帮助中心</a>
                                        </li>
                                        <li className="fl">
                                            <a
                                                href="/static/sobet/helper-center.html?type=rules"
                                                target="_blank"
                                                rel="noopener noreferrer">规则条款</a>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        )
                    }
                    <div className="footer-copyright-wrap">
                        <div ref={ref => this.copyright = ref} className="footer-copyright clearfix">
                            <div className="footer-copyright-right fl">
                                <span className="best"></span>
                                <span className="best-txt">最佳游戏环境</span>
                                <span>最佳分辨率1920 X 1080</span>
                            </div>
                            <div className="footer-copyright-left fr">
                                <span>Copyright © 2006-2018 MORECHEER Entertainment (摩臣娱乐) All Rights Reserved.</span>
                            </div>
                        </div>
                    </div>
                </footer>
                <RightFixed rightFixedRef={ref => this.rightFixed = ref} />
            </div>
        );
    }
};

export default GlobalFoot;