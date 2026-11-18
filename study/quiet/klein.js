export const kleinFn = (u, v, target) => {
  u *= Math.PI; v *= 2 * Math.PI;
  const c = Math.cos(u), s = Math.sin(u), cv_ = Math.cos(v);
  target.set(-2 / 15 * c * (3 * cv_ - 30 * s + 90 * c ** 4 * s - 60 * c ** 6 * s + 5 * c * cv_ * s),
    -1 / 15 * s * (3 * cv_ - 3 * c ** 2 * cv_ - 48 * c ** 4 * cv_ + 48 * c ** 6 * cv_ - 60 * s + 5 * c * cv_ * s - 5 * c ** 3 * cv_ * s - 80 * c ** 5 * cv_ * s + 80 * c ** 7 * cv_ * s),
    2 / 15 * (3 + 5 * c * s) * Math.sin(v));
};
