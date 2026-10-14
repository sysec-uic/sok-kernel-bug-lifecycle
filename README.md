# SoK: From Finding to Deployment — Systematizing the OS Kernel Bug Lifecycle

Companion website for our IEEE S&P 2027 SoK paper.

**Website:** https://sysec-uic.github.io/sok-kernel-bug-lifecycle/

Luyao Bai, Gengda She, Kenan Alghythee, Hang Zhang, and Xiaoguang Wang
(University of Illinois Chicago, Indiana University Bloomington)

## Contents

| Path | What |
|------|------|
| `index.html`, `assets/` | The static site (no build step; served by GitHub Pages) |
| `paper/` | Paper PDF |
| `data/systems.{csv,json}` | Classification of surveyed systems (appendix Tables 6–7) |
| `tools/extract_systems.py` | Regenerates `data/` from the LaTeX sources |

Dataset: [SyzFix on Hugging Face](https://huggingface.co/datasets/xiaoguangwang/syzfix-dataset) ·
Code: [SyzFix](https://sysec-uic.github.io/SyzFix/)

## Local preview

```bash
python3 -m http.server 8000
```

## Citation

```bibtex
@inproceedings{bai2027sok,
  title     = {{SoK}: From Finding to Deployment: Systematizing the {OS} Kernel Bug Lifecycle},
  author    = {Bai, Luyao and She, Gengda and Alghythee, Kenan and Zhang, Hang and Wang, Xiaoguang},
  booktitle = {Proceedings of the IEEE Symposium on Security and Privacy (S\&P)},
  year      = {2027}
}
```
