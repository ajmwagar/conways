#![feature(test)]

extern crate test;
extern crate conways;

#[bench]
fn universe_ticks(b: &mut test::Bencher) {
    let mut universe = conways::Universe::new();

    b.iter(|| {
        universe.tick();
    });
}
