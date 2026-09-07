export default function Hud({ game }) {
  return <div className="hud" aria-label="游戏状态"><span className="hud-life">♥ <b>{game.life}</b></span><span>★ <b>{game.score}</b></span><span>收藏 <b>{game.collection.size}/400</b></span><span>Step <b>{game.steps}</b></span></div>;
}
