export default function Hud({ game }) {
  const averageSpeed = game.steps === 0 ? 0 : game.score / game.steps;

  return <div className="hud" aria-label="游戏状态"><span>分数 <b>{game.score}</b></span><span>平均速度 <b>{averageSpeed.toFixed(2)}</b></span><span>步数 <b>{game.steps}</b></span><span>收藏 <b>{game.collection.size}</b></span></div>;
}
